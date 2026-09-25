import { snapshot } from "@/services/workspace/store";
import { exportWorkbook } from "@/adapters/workbook/export";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const data = await snapshot();
    const json = new URL(request.url).searchParams.get("format") === "json";
    const body = json
      ? JSON.stringify(data, null, 2)
      : new Uint8Array(await exportWorkbook(data));
    return new Response(body, {
      headers: {
        "Content-Type": json
          ? "application/json"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Lead-Workspace-r${data.revision}.${json ? "json" : "xlsx"}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      {
        error:
          "Export failed. For oversized Excel cells, use JSON backup. Otherwise retry when the database is available.",
      },
      { status: 503 },
    );
  }
}
