import {
  createSessionToken,
  setAdminSession,
  verifyAdminPassword,
} from "@/lib/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { password?: string };
    const password = body.password ?? "";
    if (!verifyAdminPassword(password)) {
      return Response.json(
        { error: "Contraseña incorrecta." },
        { status: 401 },
      );
    }
    const token = await createSessionToken();
    await setAdminSession(token);
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "No se pudo iniciar sesión." },
      { status: 500 },
    );
  }
}
