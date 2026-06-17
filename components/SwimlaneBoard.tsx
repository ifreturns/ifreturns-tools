"use client";

import { useState, useCallback, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import EpicCard from "./EpicCard";
import type { GitLabEpic, GitLabLabel } from "@/types/gitlab";

const UNASSIGNED_TECH = "__notech__";
const UNASSIGNED_EPIC = "__noepic__";
const CELL_SEP = "|||";
const COL_WIDTH = 240;
const ROW_HEADER_WIDTH = 180;

function mergeOrder(stored: string[], current: string[]): string[] {
  const currentSet = new Set(current);
  const filtered = stored.filter((id) => currentSet.has(id));
  const newIds = current.filter((id) => !stored.includes(id));
  return [...filtered, ...newIds];
}

async function persistOrder(key: string, order: string[]): Promise<void> {
  try {
    await fetch(`/api/board-config/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    });
  } catch {}
}

interface Props {
  initialEpics: GitLabEpic[];
  epicLabels: GitLabLabel[];
  searchQuery: string;
  selectedTechLabels: string[];
  initialColOrder: string[];
  initialRowOrder: string[];
  hiddenRowIds: Set<string>;
}

export default function SwimlaneBoard({ initialEpics, epicLabels, searchQuery, selectedTechLabels, initialColOrder, initialRowOrder, hiddenRowIds }: Props) {
  const [epics, setEpics] = useState<GitLabEpic[]>(initialEpics);

  // Unique TECH:: labels derived from epics
  const allTechCols = useMemo(() => {
    const all = new Set<string>();
    epics.forEach((e) => e.labels.filter((l) => l.startsWith("TECH::")).forEach((l) => all.add(l)));
    return [...all].sort();
  }, [epics]);

  const [colOrder, setColOrder] = useState<string[]>(() =>
    initialColOrder.length > 0 ? mergeOrder(initialColOrder, [...allTechCols, UNASSIGNED_TECH]) : [...allTechCols, UNASSIGNED_TECH]
  );
  const [rowOrder, setRowOrder] = useState<string[]>(() =>
    initialRowOrder.length > 0 ? mergeOrder(initialRowOrder, [...epicLabels.map((l) => l.name), UNASSIGNED_EPIC]) : [...epicLabels.map((l) => l.name), UNASSIGNED_EPIC]
  );
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Epics grouped by cell key: "TECH:::EPIC::"
  const cellData = useMemo(() => {
    const map = new Map<string, GitLabEpic[]>();
    for (const epic of epics) {
      const tech = epic.labels.find((l) => l.startsWith("TECH::")) ?? UNASSIGNED_TECH;
      const state = epic.labels.find((l) => l.startsWith("EPIC::")) ?? UNASSIGNED_EPIC;
      const key = `${tech}${CELL_SEP}${state}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(epic);
    }
    return map;
  }, [epics]);

  // Hidden IDs for search/filter
  const hiddenEpicIds = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const hidden = new Set<number>();
    if (!query && selectedTechLabels.length === 0) return hidden;
    for (const epic of epics) {
      const matchesSearch = !query || epic.title.toLowerCase().includes(query);
      const matchesTech =
        selectedTechLabels.length === 0 ||
        selectedTechLabels.some((t) => epic.labels.includes(t));
      if (!matchesSearch || !matchesTech) hidden.add(epic.iid);
    }
    return hidden;
  }, [epics, searchQuery, selectedTechLabels]);

  // Ordered and validated columns/rows
  const techCols = useMemo(() => {
    const valid = new Set([...allTechCols, UNASSIGNED_TECH]);
    return colOrder.filter((c) => valid.has(c));
  }, [colOrder, allTechCols]);

  const epicRows = useMemo(() => {
    const valid = new Set([...epicLabels.map((l) => l.name), UNASSIGNED_EPIC]);
    return rowOrder.filter((r) => valid.has(r) && !hiddenRowIds.has(r));
  }, [rowOrder, epicLabels, hiddenRowIds]);

  // Workload count per tech column (only visible epics)
  const colWorkload = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const epic of epics) {
      if (hiddenEpicIds.has(epic.iid)) continue;
      const tech = epic.labels.find((l) => l.startsWith("TECH::")) ?? UNASSIGNED_TECH;
      counts[tech] = (counts[tech] ?? 0) + 1;
    }
    return counts;
  }, [epics, hiddenEpicIds]);

  function moveRow(label: string, direction: "up" | "down") {
    setRowOrder((prev) => {
      const idx = prev.indexOf(label);
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (idx === -1 || newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      persistOrder("column-order", next);
      return next;
    });
  }

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId, type } = result;
      if (!destination) return;
      if (destination.droppableId === source.droppableId && destination.index === source.index) return;

      // Column reorder
      if (type === "SWIMLANE-COL") {
        setColOrder((prev) => {
          const next = [...prev];
          const [moved] = next.splice(source.index, 1);
          next.splice(destination.index, 0, moved);
          persistOrder("swimlane-col-order", next);
          return next;
        });
        return;
      }

      // Card moved between cells
      const epicIid = Number(draggableId);
      const epic = epics.find((e) => e.iid === epicIid);
      if (!epic) return;

      const [newTech, newState] = destination.droppableId.split(CELL_SEP);
      const otherLabels = epic.labels.filter(
        (l) => !l.startsWith("TECH::") && !l.startsWith("EPIC::")
      );
      const newLabels = [
        ...otherLabels,
        ...(newTech === UNASSIGNED_TECH ? [] : [newTech]),
        ...(newState === UNASSIGNED_EPIC ? [] : [newState]),
      ];

      setEpics((prev) =>
        prev.map((e) => (e.iid === epicIid ? { ...e, labels: newLabels } : e))
      );
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

  if (techCols.length === 0 || epicRows.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400">
        Cargando swimlanes...
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Status */}
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-2 px-1 flex-shrink-0">
          <span>{epics.length} epics</span>
          {saving !== null && <span className="text-blue-500 animate-pulse">Guardando...</span>}
          {error && <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded">Error: {error}</span>}
        </div>

        <div className="overflow-auto flex-1">
          <div style={{ minWidth: ROW_HEADER_WIDTH + techCols.length * COL_WIDTH }}>

            {/* Column headers — draggable */}
            <div className="flex sticky top-0 z-20 bg-gray-100 border-b-2 border-gray-200 shadow-sm">
              <div
                style={{ width: ROW_HEADER_WIDTH, minWidth: ROW_HEADER_WIDTH }}
                className="flex-shrink-0 p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider border-r border-gray-200"
              >
                Estado / Dev
              </div>
              <Droppable droppableId="swimlane-columns" direction="horizontal" type="SWIMLANE-COL">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="flex">
                    {techCols.map((tech, index) => {
                      const count = colWorkload[tech] ?? 0;
                      const label = tech === UNASSIGNED_TECH ? "Sin asignar" : tech.replace("TECH::", "");
                      const workloadColor =
                        count > 5 ? "text-red-600 bg-red-50" :
                        count > 3 ? "text-amber-600 bg-amber-50" :
                        "text-green-700 bg-green-50";
                      return (
                        <Draggable key={tech} draggableId={`swimlane-col-${tech}`} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{ width: COL_WIDTH, minWidth: COL_WIDTH, ...provided.draggableProps.style }}
                              className={`flex-shrink-0 p-3 border-l border-gray-200 cursor-grab select-none ${
                                snapshot.isDragging ? "bg-white shadow-lg opacity-90" : "bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-sm text-gray-800 truncate">{label}</span>
                                <svg className="w-3 h-3 text-gray-300 flex-shrink-0 ml-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/>
                                </svg>
                              </div>
                              <span className={`inline-block text-xs font-medium mt-1 px-1.5 py-0.5 rounded ${workloadColor}`}>
                                {count} epic{count !== 1 ? "s" : ""}
                              </span>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Swimlane rows */}
            {epicRows.map((rowLabel, rowIdx) => {
              const displayLabel = rowLabel === UNASSIGNED_EPIC
                ? "Sin estado"
                : rowLabel.replace("EPIC::", "");
              const rowTotal = techCols.reduce(
                (n, tech) => n + (cellData.get(`${tech}${CELL_SEP}${rowLabel}`)?.filter(e => !hiddenEpicIds.has(e.iid)).length ?? 0),
                0
              );

              return (
                <div key={rowLabel} className="flex border-b border-gray-200">
                  {/* Row header */}
                  <div
                    style={{ width: ROW_HEADER_WIDTH, minWidth: ROW_HEADER_WIDTH }}
                    className="flex-shrink-0 sticky left-0 z-10 bg-gray-50 border-r border-gray-200 p-3 flex flex-col justify-between min-h-[120px]"
                  >
                    <div>
                      <p className="font-medium text-sm text-gray-700 break-words leading-snug">
                        {displayLabel}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{rowTotal} epic{rowTotal !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={() => moveRow(rowLabel, "up")}
                        disabled={rowIdx === 0}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-25 text-gray-500 transition-colors"
                        title="Mover arriba"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l5 5a1 1 0 01-1.414 1.414L10 5.414 5.707 9.707a1 1 0 01-1.414-1.414l5-5A1 1 0 0110 3z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => moveRow(rowLabel, "down")}
                        disabled={rowIdx === epicRows.length - 1}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-25 text-gray-500 transition-colors"
                        title="Mover abajo"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 17a1 1 0 01-.707-.293l-5-5a1 1 0 011.414-1.414L10 14.586l4.293-4.293a1 1 0 011.414 1.414l-5 5A1 1 0 0110 17z"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Cells */}
                  {techCols.map((tech) => {
                    const cellKey = `${tech}${CELL_SEP}${rowLabel}`;
                    const cellEpics = cellData.get(cellKey) ?? [];
                    return (
                      <div
                        key={tech}
                        style={{ width: COL_WIDTH, minWidth: COL_WIDTH }}
                        className="flex-shrink-0 border-l border-gray-200"
                      >
                        <Droppable droppableId={cellKey} type="CARD">
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`flex flex-col gap-1.5 p-2 min-h-[120px] h-full transition-colors ${
                                snapshot.isDraggingOver ? "bg-blue-50" : ""
                              }`}
                            >
                              {cellEpics.map((epic, index) => (
                                <EpicCard
                                  key={epic.iid}
                                  epic={epic}
                                  index={index}
                                  isHidden={hiddenEpicIds.has(epic.iid)}
                                />
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}
