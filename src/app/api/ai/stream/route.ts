// AI is intentionally deferred for the manual pilot, even when Vercel supplies OIDC.
export async function POST() {
  return Response.json({ error: "AI processing is deferred. Use manual research and preparation for now." }, { status: 503 });
}
