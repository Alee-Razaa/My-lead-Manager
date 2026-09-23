import { NextResponse } from "next/server";
import { parseLeadFile } from "@/services/imports/parse";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((value): value is File => value instanceof File);
    if (files.length === 0) return NextResponse.json({ error: "Choose at least one CSV or XLSX file." }, { status: 400 });
    if (files.length > 10) return NextResponse.json({ error: "Import up to 10 files at a time." }, { status: 400 });
    const parsed = await Promise.all(files.map(async (file) => parseLeadFile(file.name, Buffer.from(await file.arrayBuffer()))));
    return NextResponse.json({ files: parsed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import preview failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
