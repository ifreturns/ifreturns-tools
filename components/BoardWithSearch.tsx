"use client";

import { useState, useMemo } from "react";
import Board from "./Board";
import SwimlaneBoard from "./SwimlaneBoard";
import type { GitLabEpic, GitLabLabel } from "@/types/gitlab";

type View = "board" | "swimlanes";

interface Props {
  initialEpics: GitLabEpic[];
  epicLabels: GitLabLabel[];
  initialColumnOrder: string[];
  initialSwimlaneColOrder: string[];
  initialSwimlaneRowOrder: string[];
}

export default function BoardWithSearch({ initialEpics, epicLabels, initialColumnOrder, initialSwimlaneColOrder, initialSwimlaneRowOrder }: Props) {
  const [view, setView] = useState<View>("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTechLabels, setSelectedTechLabels] = useState<string[]>([]);

  const techLabels = useMemo(() => {
    const all = new Set<string>();
    initialEpics.forEach((e) =>
      e.labels.filter((l) => l.startsWith("TECH::")).forEach((l) => all.add(l))
    );
    return [...all].sort();
  }, [initialEpics]);

  const isFiltering = searchQuery.trim() !== "" || selectedTechLabels.length > 0;

  function toggleTechLabel(label: string) {
    setSelectedTechLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar: search + tabs */}
      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
        {/* Search input */}
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar epics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-56"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* TECH:: filter chips */}
        {techLabels.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-400 font-medium">TECH:</span>
            {techLabels.map((label) => {
              const active = selectedTechLabels.includes(label);
              return (
                <button
                  key={label}
                  onClick={() => toggleTechLabel(label)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                    active
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-indigo-400 hover:text-indigo-600"
                  }`}
                >
                  {label.replace("TECH::", "")}
                </button>
              );
            })}
          </div>
        )}

        {isFiltering && (
          <button
            onClick={() => { setSearchQuery(""); setSelectedTechLabels([]); }}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Limpiar filtros
          </button>
        )}

        {/* Tab switcher */}
        <div className="ml-auto flex items-center bg-white border border-gray-200 rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setView("board")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              view === "board"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Tablero
          </button>
          <button
            onClick={() => setView("swimlanes")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              view === "swimlanes"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            Swimlanes
          </button>
        </div>
      </div>

      {/* Active view */}
      {view === "board" ? (
        <Board
          initialEpics={initialEpics}
          epicLabels={epicLabels}
          searchQuery={searchQuery}
          selectedTechLabels={selectedTechLabels}
          initialColumnOrder={initialColumnOrder}
        />
      ) : (
        <SwimlaneBoard
          initialEpics={initialEpics}
          epicLabels={epicLabels}
          searchQuery={searchQuery}
          selectedTechLabels={selectedTechLabels}
          initialColOrder={initialSwimlaneColOrder}
          initialRowOrder={initialSwimlaneRowOrder}
        />
      )}
    </div>
  );
}
