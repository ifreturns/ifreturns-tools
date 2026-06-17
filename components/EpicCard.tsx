"use client";

import { Draggable } from "@hello-pangea/dnd";
import type { GitLabEpic } from "@/types/gitlab";

interface Props {
  epic: GitLabEpic;
  index: number;
}

function formatDate(date: string | null): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function EpicCard({ epic, index }: Props) {
  const nonEpicLabels = epic.labels.filter((l) => !l.startsWith("EPIC::"));
  const dueDate = formatDate(epic.due_date ?? epic.end_date);
  const isOverdue =
    (epic.due_date || epic.end_date) &&
    new Date(epic.due_date ?? epic.end_date ?? "") < new Date();

  return (
    <Draggable draggableId={String(epic.iid)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`
            bg-white rounded-lg border border-gray-200 p-3 shadow-sm
            hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing
            ${snapshot.isDragging ? "shadow-lg rotate-1 opacity-90" : ""}
          `}
        >
          {/* Epic reference + state */}
          <div className="flex items-center justify-between mb-1.5">
            <a
              href={epic.web_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-blue-500 font-mono"
              onClick={(e) => e.stopPropagation()}
            >
              {epic.references.short}
            </a>
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                epic.state === "opened"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {epic.state === "opened" ? "open" : "closed"}
            </span>
          </div>

          {/* Title */}
          <a
            href={epic.web_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm font-medium text-gray-800 hover:text-blue-600 leading-snug mb-2"
            onClick={(e) => e.stopPropagation()}
          >
            {epic.title}
          </a>

          {/* Labels (non-EPIC::) */}
          {nonEpicLabels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {nonEpicLabels.map((label) => (
                <span
                  key={label}
                  className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100"
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Footer: author + due date */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1.5">
              {epic.author.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={epic.author.avatar_url}
                  alt={epic.author.name}
                  title={epic.author.name}
                  className="w-5 h-5 rounded-full"
                />
              )}
              <span className="text-xs text-gray-400 truncate max-w-[100px]">
                {epic.author.username}
              </span>
            </div>
            {dueDate && (
              <span
                className={`text-xs ${
                  isOverdue ? "text-red-500 font-medium" : "text-gray-400"
                }`}
              >
                {isOverdue ? "⚠ " : ""}
                {dueDate}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
