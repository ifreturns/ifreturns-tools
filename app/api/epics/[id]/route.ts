import { NextRequest, NextResponse } from "next/server";
import { updateEpicLabels } from "@/lib/gitlab";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const groupId = process.env.GITLAB_GROUP_ID;
  if (!groupId) {
    return NextResponse.json({ error: "GITLAB_GROUP_ID not configured" }, { status: 500 });
  }

  const { id } = await params;
  const epicIid = Number(id);
  if (isNaN(epicIid)) {
    return NextResponse.json({ error: "Invalid epic ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { labels } = body as { labels: string[] };

    if (!Array.isArray(labels)) {
      return NextResponse.json({ error: "labels must be an array" }, { status: 400 });
    }

    const updated = await updateEpicLabels(groupId, epicIid, labels);
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
