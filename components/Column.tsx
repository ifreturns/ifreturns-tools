"use client";

import { Droppable } from "@hello-pangea/dnd";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import EpicCard from "./EpicCard";
import type { BoardColumn } from "@/types/gitlab";

interface Props {
  column: BoardColumn;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export default function Column({ column, dragHandleProps }: Props) {
  const rgb = hexToRgb(column.color || "#6366f1");

  return (
    <div className="flex flex-col w-72 flex-shrink-0 bg-gray-50 rounded-xl border border-gray-200">
      {/* Column header — drag handle */}
      <div
        {...dragHandleProps}
        className="flex items-center justify-between px-4 py-3 rounded-t-xl border-b border-gray-200 cursor-grab active:cursor-grabbing select-none"
        style={{ backgroundColor: `rgba(${rgb}, 0.12)` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: column.color || "#6366f1" }}
          />
          <h3 className="font-semibold text-sm text-gray-700 truncate">
            {column.label.replace("EPIC::", "")}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-white text-gray-500 font-medium px-2 py-0.5 rounded-full border border-gray-200">
            {column.epics.length}
          </span>
          {/* Drag hint icon */}
          <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/>
          </svg>
        </div>
      </div>

      {/* Cards */}
      <Droppable droppableId={column.id} type="CARD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-2 p-2 min-h-[120px] flex-1 rounded-b-xl transition-colors ${
              snapshot.isDraggingOver ? "bg-blue-50" : ""
            }`}
          >
            {column.epics.map((epic, index) => (
              <EpicCard key={epic.iid} epic={epic} index={index} />
            ))}
            {provided.placeholder}
            {column.epics.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-20 text-xs text-gray-300 border-2 border-dashed border-gray-200 rounded-lg">
                Sin epics
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
