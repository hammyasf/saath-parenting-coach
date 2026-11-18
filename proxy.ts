import { NextResponse, type NextRequest } from "next/server";

// A shared password for the hosted demo, so the link is not open to the world and the
// API keys behind it cannot be spent by strangers. Off when SITE_PASSWORD is not set
// (local development). Any user name is accepted; only the password is checked.
export function proxy(request: NextRequest) {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) return NextResponse.next();
  const [scheme, encoded] = (request.headers.get("authorization") ?? "").split(" ");
  if (scheme === "Basic" && encoded) {
    const given = atob(encoded);
    if (given.slice(given.indexOf(":") + 1) === expected) return NextResponse.next();
  }
  return new NextResponse("Password required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Saath demo", charset="UTF-8"' },
  });
}

export const config = { matcher: "/((?!_next/static|_next/image).*)" };
