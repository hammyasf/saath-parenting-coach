import { respond } from "@/lib/pipeline";
import { allow, parseBody, parseMode } from "@/lib/request";

// Gate + coach + check can take a while on a cold start; give the function room.
export const maxDuration = 40;

// Message text is never logged or stored here.
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!allow(ip)) return Response.json({ error: "slow_down" }, { status: 429 });

  const body = await request.json().catch(() => null);
  const turns = parseBody(body);
  if (!turns) return Response.json({ error: "bad_request" }, { status: 400 });

  return Response.json(await respond(turns, undefined, parseMode(body)));
}
