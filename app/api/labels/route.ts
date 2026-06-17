import { NextResponse } from "next/server";
import { getGroupLabels } from "@/lib/gitlab";
import type { GitLabLabel } from "@/types/gitlab";

export async function GET() {
  const groupId = process.env.GITLAB_GROUP_ID;
  if (!groupId) {
    return NextResponse.json({ error: "GITLAB_GROUP_ID not configured" }, { status: 500 });
  }

  try {
    const labels = await getGroupLabels(groupId);
    const epicLabels = labels
      .filter((l: GitLabLabel) => l.name.startsWith("EPIC::"))
      .sort((a: GitLabLabel, b: GitLabLabel) => a.name.localeCompare(b.name));

    return NextResponse.json(epicLabels);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
