import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { parseTimetableText } from "@/lib/timetable-parser";

const bodySchema = z.object({ text: z.string().min(1) });

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const lines = parseTimetableText(parsed.data.text);
  return NextResponse.json({ lines });
}
