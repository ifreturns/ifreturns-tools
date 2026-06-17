"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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

  // Per-tab hidden states (EPIC::) — empty = show all
  const [boardHiddenStates, setBoardHiddenStates] = useState<Set<string>>(new Set());
  const [swimlaneHiddenStates, setSwimlaneHiddenStates] = useState<Set<string>>(new Set());
  const [statesDropdownOpen, setStatesDropdownOpen] = useState(false);
  const statesDropdownRef = useRef<HTMLDivElement>(null);

  const allEpicStateNames = useMemo(() => epicLabels.map((l) => l.name), [epicLabels]);
  const currentHiddenStates = view === "board" ? boardHiddenStates : swimlaneHiddenStates;

  const techLabels = useMemo(() => {
    const all = new Set<string>();
    initialEpics.forEach((e) =>
      e.labels.filter((l) => l.startsWith("TECH::")).forEach((l) => all.add(l))
    );
    return [...all].sort();
  }, [initialEpics]);

  const isFiltering =
    searchQuery.trim() !== "" ||
    selectedTechLabels.length > 0 ||
    currentHiddenStates.size > 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (statesDropdownRef.current && !statesDropdownRef.current.contains(e.target as Node)) {
        setStatesDropdownOpen(false);
      }
    }
    if (statesDropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [statesDropdownOpen]);

  function toggleTechLabel(label: string) {
    setSelectedTechLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  }

  function toggleHiddenState(state: string) {
    const setter = view === "board" ? setBoardHiddenStates : setSwimlaneHiddenStates;
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(state)) next.delete(state);
      else next.add(state);
      return next;
    });
  }

  function clearFilters() {
    setSearchQuery("");
    setSelectedTechLabels([]);
    if (view === "board") setBoardHiddenStates(new Set());
    else setSwimlaneHiddenStates(new Set());
  }

  const hiddenCount = currentHiddenStates.size;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
        {/* Search input */}
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
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

        {/* Estados dropdown */}
        {allEpicStateNames.length > 0 && (
          <div className="relative" ref={statesDropdownRef}>
            <button
              onClick={() => setStatesDropdownOpen((o) => !o)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                hiddenCount > 0
                  ? "bg-purple-50 border-purple-300 text-purple-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 8h12M9 12h6" />
              </svg>
              Estados
              {hiddenCount > 0 && (
                <span className="bg-purple-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {hiddenCount}
                </span>
              )}
              <svg className={`w-3 h-3 transition-transform ${statesDropdownOpen ? "rotate-180" : ""}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {statesDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-[180px] py-1">
                {allEpicStateNames.map((state) => {
                  const hidden = currentHiddenStates.has(state);
                  return (
                    <label
                      key={state}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={!hidden}
                        onChange={() => toggleHiddenState(state)}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                      />
                      {state.replace("EPIC::", "")}
                    </label>
                  );
                })}
                {hiddenCount > 0 && (
                  <>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => {
                        if (view === "board") setBoardHiddenStates(new Set());
                        else setSwimlaneHiddenStates(new Set());
                        setStatesDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                    >
                      Mostrar todos
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {isFiltering && (
          <button
            onClick={clearFilters}
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
              view === "board" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"
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
              view === "swimlanes" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"
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
          hiddenStateIds={boardHiddenStates}
        />
      ) : (
        <SwimlaneBoard
          initialEpics={initialEpics}
          epicLabels={epicLabels}
          searchQuery={searchQuery}
          selectedTechLabels={selectedTechLabels}
          initialColOrder={initialSwimlaneColOrder}
          initialRowOrder={initialSwimlaneRowOrder}
          hiddenRowIds={swimlaneHiddenStates}
        />
      )}
    </div>
  );
}
