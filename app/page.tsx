export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { UserButton } from "@clerk/nextjs";
import { getGroupEpics, getGroupLabels, getGroupClosedEpics } from "@/lib/gitlab";
import { getConfig } from "@/lib/storage";
import BoardWithSearch from "@/components/BoardWithSearch";
import type { GitLabLabel } from "@/types/gitlab";

async function BoardLoader() {
  const groupId = process.env.GITLAB_GROUP_ID;

  if (!groupId || !process.env.GITLAB_TOKEN) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 max-w-md text-center">
          <p className="text-amber-800 font-medium mb-2">Configuración requerida</p>
          <p className="text-amber-700 text-sm">
            Crea un archivo <code className="bg-amber-100 px-1 rounded">.env.local</code> con{" "}
            <code className="bg-amber-100 px-1 rounded">GITLAB_TOKEN</code> y{" "}
            <code className="bg-amber-100 px-1 rounded">GITLAB_GROUP_ID</code>.
          </p>
        </div>
      </div>
    );
  }

  const [epics, allLabels, closedEpics, columnOrder, swimlaneColOrder] = await Promise.all([
    getGroupEpics(groupId),
    getGroupLabels(groupId),
    getGroupClosedEpics(groupId),
    getConfig<string[]>("column-order", []),
    getConfig<string[]>("swimlane-col-order", []),
  ]);

  const epicLabels: GitLabLabel[] = allLabels
    .filter((l) => l.name.startsWith("EPIC::"))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <BoardWithSearch
      initialEpics={epics}
      epicLabels={epicLabels}
      initialColumnOrder={columnOrder}
      initialSwimlaneColOrder={swimlaneColOrder}
      initialSwimlaneRowOrder={columnOrder}
      closedEpics={closedEpics}
    />
  );
}

export default function Home() {
  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 25 24" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24.507 9.5l-.034-.09L21.082.57a.748.748 0 00-1.418.019l-2.096 6.406H7.43L5.334.59a.748.748 0 00-1.418-.02L.484 9.411.45 9.5a5.29 5.29 0 001.762 6.106l.009.007.024.018 4.361 3.261 2.157 1.63 1.312.99a.872.872 0 001.03 0l1.312-.99 2.157-1.63 4.393-3.28.01-.007A5.29 5.29 0 0024.507 9.5z" fill="#E24329"/>
            </svg>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-none">GitLab Epic Board</h1>
              <p className="text-xs text-gray-400 mt-0.5">Tablero Kanban de epics por estado</p>
            </div>
          </div>
          <UserButton />
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-6">
        <Suspense fallback={<BoardSkeleton />}>
          <BoardLoader />
        </Suspense>
      </main>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="w-72 flex-shrink-0 bg-gray-50 rounded-xl border border-gray-200 p-3 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-32 mb-3" />
          {[1, 2].map((j) => (
            <div key={j} className="bg-white rounded-lg border border-gray-200 p-3 mb-2">
              <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-full mb-1" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
