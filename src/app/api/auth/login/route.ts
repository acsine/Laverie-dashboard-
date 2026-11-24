import { NextResponse } from "next/server";
import { loginAction } from "@/server/auth/login";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = await loginAction(body);
  if (!result.ok) {
    return NextResponse.json(result, { status: 401 });
  }
  return NextResponse.json(result);
}
