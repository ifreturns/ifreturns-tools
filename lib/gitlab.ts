import type { GitLabEpic, GitLabLabel } from "@/types/gitlab";

const GITLAB_BASE_URL = "https://gitlab.com/api/v4";

function getHeaders(): HeadersInit {
  const token = process.env.GITLAB_TOKEN;
  if (!token) throw new Error("GITLAB_TOKEN environment variable is not set");
  return { "PRIVATE-TOKEN": token };
}

async function paginatedFetch<T>(url: string, params: URLSearchParams): Promise<T[]> {
  const results: T[] = [];
  let page = 1;

  while (true) {
    params.set("page", String(page));
    params.set("per_page", "100");
    const res = await fetch(`${url}?${params}`, {
      headers: getHeaders(),
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitLab API error ${res.status}: ${body}`);
    }

    const data: T[] = await res.json();
    results.push(...data);

    const totalPages = Number(res.headers.get("X-Total-Pages") ?? 1);
    if (page >= totalPages) break;
    page++;
  }

  return results;
}

export async function getGroupLabels(groupId: string): Promise<GitLabLabel[]> {
  const params = new URLSearchParams({ with_counts: "false" });
  return paginatedFetch<GitLabLabel>(
    `${GITLAB_BASE_URL}/groups/${encodeURIComponent(groupId)}/labels`,
    params
  );
}

export async function getGroupEpics(groupId: string): Promise<GitLabEpic[]> {
  const params = new URLSearchParams({ state: "opened", include_descendant_groups: "true" });
  return paginatedFetch<GitLabEpic>(
    `${GITLAB_BASE_URL}/groups/${encodeURIComponent(groupId)}/epics`,
    params
  );
}

export async function getGroupClosedEpics(groupId: string): Promise<GitLabEpic[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - 1);
  const params = new URLSearchParams({
    state: "closed",
    include_descendant_groups: "true",
    updated_after: since.toISOString(),
  });
  const epics = await paginatedFetch<GitLabEpic>(
    `${GITLAB_BASE_URL}/groups/${encodeURIComponent(groupId)}/epics`,
    params
  );
  return epics.filter((e) => e.closed_at && new Date(e.closed_at) >= since);
}

export async function updateEpicLabels(
  groupId: string,
  epicIid: number,
  labels: string[]
): Promise<GitLabEpic> {
  const token = process.env.GITLAB_TOKEN;
  if (!token) throw new Error("GITLAB_TOKEN environment variable is not set");

  const res = await fetch(
    `${GITLAB_BASE_URL}/groups/${encodeURIComponent(groupId)}/epics/${epicIid}`,
    {
      method: "PUT",
      headers: {
        "PRIVATE-TOKEN": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ labels: labels.join(",") }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitLab API error ${res.status}: ${body}`);
  }

  return res.json();
}
