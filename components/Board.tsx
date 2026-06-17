"use client";

import { useState, useCallback, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import Column from "./Column";
import { StaticEpicCard } from "./EpicCard";
import type { BoardColumn, GitLabEpic, GitLabLabel } from "@/types/gitlab";

function buildColumns(epics: GitLabEpic[], epicLabels: GitLabLabel[]): BoardColumn[] {
  const labelColumns: BoardColumn[] = epicLabels.map((label) => ({
    id: label.name,
    label: label.name,
    color: label.color,
    epics: [],
  }));

  for (const epic of epics) {
    const epicStatusLabel = epic.labels.find((l) => l.startsWith("EPIC::"));
    if (epicStatusLabel) {
      const col = labelColumns.find((c) => c.label === epicStatusLabel);
      if (col) col.epics.push(epic);
    }
    // epics without state are silently ignored
  }

  return labelColumns.filter((c) => c.epics.length > 0 || epicLabels.length > 0);
}

function mergeOrder(stored: string[], current: string[]): string[] {
  const currentSet = new Set(current);
  const filtered = stored.filter((id) => currentSet.has(id));
  const newIds = current.filter((id) => !stored.includes(id));
  return [...filtered, ...newIds];
}

async function persistColumnOrder(order: string[]): Promise<void> {
  try {
    await fetch("/api/column-order", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    });
  } catch {}
}

interface Props {
  initialEpics: GitLabEpic[];
  epicLabels: GitLabLabel[];
  closedEpics: GitLabEpic[];
  searchQuery: string;
  selectedTechLabels: string[];
  initialColumnOrder: string[];
  hiddenStateIds: Set<string>;
}

export default function Board({ initialEpics, epicLabels, closedEpics, searchQuery, selectedTechLabels, initialColumnOrder, hiddenStateIds }: Props) {
  const [epics, setEpics] = useState<GitLabEpic[]>(initialEpics);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const baseColumns = useMemo(() => buildColumns(epics, epicLabels), [epics, epicLabels]);

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const defaults = baseColumns.map((c) => c.id);
    return initialColumnOrder.length > 0 ? mergeOrder(initialColumnOrder, defaults) : defaults;
  });

  const orderedColumns = useMemo(() => {
    const colMap = new Map(baseColumns.map((c) => [c.id, c]));
    return columnOrder.filter((id) => colMap.has(id)).map((id) => colMap.get(id)!);
  }, [baseColumns, columnOrder]);

  // Compute hidden epic iids — never changes orderedColumns so DnD indices stay stable
  const hiddenEpicIds = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const hidden = new Set<number>();
    if (!query && selectedTechLabels.length === 0) return hidden;
    for (const col of orderedColumns) {
      for (const epic of col.epics) {
        const matchesSearch = !query || epic.title.toLowerCase().includes(query);
        const matchesTech =
          selectedTechLabels.length === 0 ||
          selectedTechLabels.some((t) => epic.labels.includes(t));
        if (!matchesSearch || !matchesTech) hidden.add(epic.iid);
      }
    }
    return hidden;
  }, [orderedColumns, searchQuery, selectedTechLabels]);

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId, type } = result;
      if (!destination) return;
      if (destination.droppableId === source.droppableId && destination.index === source.index) return;

      if (type === "COLUMN") {
        setColumnOrder((prev) => {
          const next = [...prev];
          const [moved] = next.splice(source.index, 1);
          next.splice(destination.index, 0, moved);
          persistColumnOrder(next);
          return next;
        });
        return;
      }

      const epicIid = Number(draggableId);
      const epic = epics.find((e) => e.iid === epicIid);
      if (!epic) return;

      const targetColumnId = destination.droppableId;
      const otherLabels = epic.labels.filter((l) => !l.startsWith("EPIC::"));
      const newLabels = [...otherLabels, targetColumnId];

      setEpics((prev) => prev.map((e) => (e.iid === epicIid ? { ...e, labels: newLabels } : e)));
      setError(null);
      setSaving(epicIid);

      try {
        const res = await fetch(`/api/epics/${epicIid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ labels: newLabels }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to update");
        }
      } catch (err) {
        setEpics((prev) => prev.map((e) => (e.iid === epicIid ? epic : e)));
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setSaving(null);
      }
    },
    [epics]
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden gap-1">
      <div className="flex items-center gap-3 text-xs text-gray-400 px-1">
        <span>{epics.length} epic{epics.length !== 1 ? "s" : ""}</span>
        {saving !== null && <span className="text-blue-500 animate-pulse">Saving...</span>}
        {error && <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded">Error: {error}</span>}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" direction="horizontal" type="COLUMN">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start"
            >
              {orderedColumns.map((column, index) => {
                const isColHidden = hiddenStateIds.has(column.id);
                return (
                  <Draggable
                    key={column.id}
                    draggableId={`col::${column.id}`}
                    index={index}
                    isDragDisabled={isColHidden}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={{
                          ...provided.draggableProps.style,
                          ...(isColHidden ? { width: 0, minWidth: 0, overflow: "hidden", padding: 0, margin: 0 } : {}),
                        }}
                        className={snapshot.isDragging ? "opacity-90 rotate-1" : ""}
                      >
                        <Column
                          column={column}
                          dragHandleProps={provided.dragHandleProps}
                          hiddenEpicIds={hiddenEpicIds}
                        />
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}

              {/* CLOSED — last 30 days, filtered by search */}
              {closedEpics.length > 0 && (() => {
                const query = searchQuery.toLowerCase().trim();
                const visible = closedEpics.filter((e) => {
                  const matchesSearch = !query || e.title.toLowerCase().includes(query);
                  const matchesTech =
                    selectedTechLabels.length === 0 ||
                    selectedTechLabels.some((t) => e.labels.includes(t));
                  return matchesSearch && matchesTech;
                });
                return (
                  <div className="w-72 flex-shrink-0 bg-gray-50 rounded-xl border border-gray-200 p-3 select-none opacity-80">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                        <span className="font-semibold text-sm text-gray-500 tracking-wide">CLOSED</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {visible.length}
                        </span>
                        <span className="text-xs text-gray-300">last month</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {visible.map((epic) => (
                        <StaticEpicCard key={epic.iid} epic={epic} />
                      ))}
                      {visible.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-4">No results</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
