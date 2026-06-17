"use client";

import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import type { GitLabEpic } from "@/types/gitlab";

const SHOWN_PREFIXES = ["PRI::", "PRODUCT::", "TECH::", "TYP::"];

interface Props {
  epic: GitLabEpic;
  index: number;
  isHidden?: boolean;
}

function formatDate(date: string | null): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// Converts text to React nodes with clickable links (markdown + bare URLs)
function linkify(text: string): React.ReactNode[] {
  const regex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/\S+)/g;
  const result: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) result.push(text.slice(last, match.index));
    if (match[1] && match[2]) {
      result.push(<a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{match[1]}</a>);
    } else if (match[3]) {
      result.push(<a key={match.index} href={match[3]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{match[3]}</a>);
    }
    last = regex.lastIndex;
  }
  if (last < text.length) result.push(text.slice(last));
  return result;
}

function DescriptionModal({ epic, onClose }: { epic: GitLabEpic; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="pr-4">
            <p className="text-xs text-gray-400 font-mono mb-1">{epic.references.short}</p>
            <h3 className="font-semibold text-gray-900 text-sm leading-snug">{epic.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 text-sm text-gray-700 leading-relaxed">
          {epic.description ? (
            epic.description.split(/\n/).map((line, i) => (
              <p key={i} className={line.trim() === "" ? "h-3" : "mb-1"}>
                {linkify(line)}
              </p>
            ))
          ) : (
            <p className="text-gray-400 italic">No description</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
          <a
            href={epic.web_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            View in GitLab →
          </a>
        </div>
      </div>
    </div>
  );
}

export function StaticEpicCard({ epic }: { epic: GitLabEpic }) {
  const [showDesc, setShowDesc] = useState(false);
  const visibleLabels = epic.labels.filter((l) => SHOWN_PREFIXES.some((p) => l.startsWith(p)));
  const dueDate = formatDate(epic.due_date ?? epic.end_date);
  const isOverdue =
    (epic.due_date || epic.end_date) &&
    new Date(epic.due_date ?? epic.end_date ?? "") < new Date();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
      <div className="flex items-center justify-between mb-1.5">
        <a href={epic.web_url} target="_blank" rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-blue-500 font-mono">
          {epic.references.short}
        </a>
        <div className="flex items-center gap-1.5">
          {epic.description && (
            <button onClick={() => setShowDesc(true)} title="View description"
              className="text-xs font-medium text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded transition-colors leading-none">
              view
            </button>
          )}
        </div>
      </div>
      <a href={epic.web_url} target="_blank" rel="noopener noreferrer"
        className="block text-sm font-medium text-gray-800 hover:text-blue-600 leading-snug mb-2">
        {epic.title}
      </a>
      {visibleLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {visibleLabels.map((label) => (
            <span key={label} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
              {label}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1.5">
          {epic.author.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={epic.author.avatar_url} alt={epic.author.name} title={epic.author.name} className="w-5 h-5 rounded-full" />
          )}
          <span className="text-xs text-gray-400 truncate max-w-[100px]">{epic.author.username}</span>
        </div>
        {dueDate && (
          <span className={`text-xs ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
            {isOverdue ? "⚠ " : ""}{dueDate}
          </span>
        )}
      </div>
      {showDesc && <DescriptionModal epic={epic} onClose={() => setShowDesc(false)} />}
    </div>
  );
}

export default function EpicCard({ epic, index, isHidden = false }: Props) {
  const [showDesc, setShowDesc] = useState(false);

  const visibleLabels = epic.labels.filter((l) =>
    SHOWN_PREFIXES.some((p) => l.startsWith(p))
  );
  const dueDate = formatDate(epic.due_date ?? epic.end_date);
  const isOverdue =
    (epic.due_date || epic.end_date) &&
    new Date(epic.due_date ?? epic.end_date ?? "") < new Date();

  return (
    <Draggable draggableId={String(epic.iid)} index={index} isDragDisabled={isHidden}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            ...(isHidden ? { height: 0, overflow: "hidden", padding: 0, margin: 0, border: 0 } : {}),
          }}
          className={`
            bg-white rounded-lg border border-gray-200 p-3 shadow-sm
            hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing
            ${snapshot.isDragging ? "shadow-lg rotate-1 opacity-90" : ""}
          `}
        >
          {/* Reference + state + description button */}
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
            <div className="flex items-center gap-1.5">
              {epic.description && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDesc(true); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="text-xs font-medium text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded transition-colors leading-none">
                  view
                </button>
              )}
            </div>
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

          {/* Labels */}
          {visibleLabels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {visibleLabels.map((label) => (
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
              <span className={`text-xs ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
                {isOverdue ? "⚠ " : ""}
                {dueDate}
              </span>
            )}
          </div>

          {/* Description modal */}
          {showDesc && <DescriptionModal epic={epic} onClose={() => setShowDesc(false)} />}
        </div>
      )}
    </Draggable>
  );
}
