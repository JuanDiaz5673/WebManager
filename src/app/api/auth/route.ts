import { NextRequest, NextResponse } from "next/server";
import { signJWT, verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const jwtSecret = process.env.JWT_SECRET;

  if (!passwordHash || !jwtSecret) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 }
    );
  }

  const valid = await verifyPassword(password, passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await signJWT({ role: "admin" }, jwtSecret, 86400);

  const response = NextResponse.json({ success: true });
  response.cookies.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 86400,
    path: "/",
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("auth_token");
  return response;
}
