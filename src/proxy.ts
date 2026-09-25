import { NextRequest, NextResponse } from "next/server";
import { validSession } from "@/services/auth/session";
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin)
      return Response.json(
        { error: "Cross-site request blocked." },
        { status: 403 },
      );
  }
  if (path === "/login" || path === "/api/session") return NextResponse.next();
  const secret = process.env.WORKSPACE_PASSWORD;
  if (!secret)
    return Response.json(
      { error: "Workspace sign-in is not configured." },
      { status: 503 },
    );
  if (validSession(request.cookies.get("lead_session")?.value ?? "", secret))
    return NextResponse.next();
  if (path.startsWith("/api/"))
    return Response.json(
      { error: "Please sign in to the workspace." },
      { status: 401 },
    );
  return NextResponse.redirect(new URL("/login", request.url));
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
