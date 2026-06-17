import { NextResponse } from "next/server";
import { getGroupEpics } from "@/lib/gitlab";

export async function GET() {
  const groupId = process.env.GITLAB_GROUP_ID;
  if (!groupId) {
    return NextResponse.json({ error: "GITLAB_GROUP_ID not configured" }, { status: 500 });
  }

  try {
    const epics = await getGroupEpics(groupId);
    return NextResponse.json(epics);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
