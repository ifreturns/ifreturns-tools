"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import Column from "./Column";
import type { BoardColumn, GitLabEpic, GitLabLabel } from "@/types/gitlab";

const UNASSIGNED_COLUMN_ID = "__unassigned__";

const UNASSIGNED_COLUMN: Omit<BoardColumn, "epics"> = {
  id: UNASSIGNED_COLUMN_ID,
  label: "Sin estado",
  color: "#9ca3af",
};

function buildColumns(epics: GitLabEpic[], epicLabels: GitLabLabel[]): BoardColumn[] {
  const labelColumns: BoardColumn[] = epicLabels.map((label) => ({
    id: label.name,
    label: label.name,
    color: label.color,
    epics: [],
  }));

  const unassigned: BoardColumn = { ...UNASSIGNED_COLUMN, epics: [] };

  for (const epic of epics) {
    const epicStatusLabel = epic.labels.find((l) => l.startsWith("EPIC::"));
    if (epicStatusLabel) {
      const col = labelColumns.find((c) => c.label === epicStatusLabel);
      if (col) { col.epics.push(epic); continue; }
    }
    unassigned.epics.push(epic);
  }

  const columns = labelColumns.filter((c) => c.epics.length > 0 || epicLabels.length > 0);
  if (unassigned.epics.length > 0) columns.push(unassigned);
  return columns;
}

// Keep stored positions; append new column IDs at the end, drop removed ones
function mergeOrder(stored: string[], current: string[]): string[] {
  const currentSet = new Set(current);
  const filtered = stored.filter((id) => currentSet.has(id));
  const newIds = current.filter((id) => !stored.includes(id));
  return [...filtered, ...newIds];
}

async function fetchColumnOrder(): Promise<string[]> {
  try {
    const res = await fetch("/api/column-order");
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
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
}

export default function Board({ initialEpics, epicLabels }: Props) {
  const [epics, setEpics] = useState<GitLabEpic[]>(initialEpics);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const baseColumns = useMemo(() => buildColumns(epics, epicLabels), [epics, epicLabels]);

  const [columnOrder, setColumnOrder] = useState<string[]>(() =>
    baseColumns.map((c) => c.id)
  );

  // Load shared order from KV on mount
  useEffect(() => {
    fetchColumnOrder().then((stored) => {
      if (stored.length > 0) {
        setColumnOrder(mergeOrder(stored, baseColumns.map((c) => c.id)));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orderedColumns = useMemo(() => {
    const colMap = new Map(baseColumns.map((c) => [c.id, c]));
    return columnOrder.filter((id) => colMap.has(id)).map((id) => colMap.get(id)!);
  }, [baseColumns, columnOrder]);

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId, type } = result;
      if (!destination) return;
      if (destination.droppableId === source.droppableId && destination.index === source.index) return;

      // Column reorder
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

      // Card move
      const epicIid = Number(draggableId);
      const epic = epics.find((e) => e.iid === epicIid);
      if (!epic) return;

      const targetColumnId = destination.droppableId;
      const isUnassigned = targetColumnId === UNASSIGNED_COLUMN_ID;
      const otherLabels = epic.labels.filter((l) => !l.startsWith("EPIC::"));
      const newLabels = isUnassigned ? otherLabels : [...otherLabels, targetColumnId];

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
          throw new Error(data.error ?? "Error al actualizar");
        }
      } catch (err) {
        setEpics((prev) => prev.map((e) => (e.iid === epicIid ? epic : e)));
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setSaving(null);
      }
    },
    [epics]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4 px-1">
        <span className="text-sm text-gray-500">
          {epics.length} epic{epics.length !== 1 ? "s" : ""}
        </span>
        {saving !== null && (
          <span className="text-xs text-blue-500 animate-pulse">Guardando...</span>
        )}
        {error && (
          <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">
            Error: {error}
          </span>
        )}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" direction="horizontal" type="COLUMN">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start"
            >
              {orderedColumns.map((column, index) => (
                <Draggable key={column.id} draggableId={`col::${column.id}`} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={snapshot.isDragging ? "opacity-90 rotate-1" : ""}
                    >
                      <Column column={column} dragHandleProps={provided.dragHandleProps} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
