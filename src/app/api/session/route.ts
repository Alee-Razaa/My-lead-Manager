import { NextResponse } from "next/server";
import { equalSecret, issueSession } from "@/services/auth/session";
export async function POST(request: Request) {
  const secret = process.env.WORKSPACE_PASSWORD;
  if (!secret)
    return Response.json(
      { error: "Sign-in is not configured." },
      { status: 503 },
    );
  let password: unknown;
  try {
    password = (await request.json()).password;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (
    typeof password !== "string" ||
    password.length > 200 ||
    !equalSecret(password, secret)
  )
    return Response.json(
      { error: "Incorrect workspace password." },
      { status: 401 },
    );
  const response = NextResponse.json({ signedIn: true });
  response.cookies.set("lead_session", issueSession(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 604800,
  });
  return response;
}
export async function DELETE() {
  const response = NextResponse.json({ signedIn: false });
  response.cookies.set("lead_session", "", { maxAge: 0, path: "/" });
  return response;
}
