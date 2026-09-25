import { snapshot, execute } from "@/services/workspace/store";
import { workspaceCommand } from "@/domain/workspace";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(await snapshot(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Cannot load the database. Check the connection and retry." },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const input = workspaceCommand.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        { error: input.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    return Response.json(await execute(input.data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed.";
    const known =
      /^(Some selected|This lead|Add a reason|Ready requires|Lead no longer)/.test(
        message,
      );
    return Response.json(
      {
        error: known
          ? message
          : "Save failed. Your changes have not been saved; retry.",
      },
      { status: known ? 409 : 503 },
    );
  }
}
