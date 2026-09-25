import { streamText } from "ai";

export const runtime = "nodejs";

const defaultModel = "openai/gpt-6-astra";

export async function POST(request: Request) {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    return Response.json({ error: "AI Gateway is not configured." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { prompt?: unknown };
    if (typeof body.prompt !== "string" || body.prompt.trim().length === 0) {
      return Response.json({ error: "A non-empty prompt is required." }, { status: 400 });
    }

    const result = streamText({
      model: process.env.AI_GATEWAY_MODEL ?? defaultModel,
      prompt: body.prompt,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI Gateway request failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}
