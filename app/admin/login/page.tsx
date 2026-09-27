"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Heart } from "lucide-react";

function AdminLoginForm() {
  const params = useSearchParams();
  const returnTo = params.get("return_to") || "/admin";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error || "No se pudo entrar.");
      window.location.href = returnTo.startsWith("/") ? returnTo : "/admin";
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="access-page">
      <p className="eyebrow">NUESTRO RINCÓN · ACCESO PRIVADO</p>
      <h1>
        Solo para quien
        <br />
        prepara la sorpresa.
      </h1>
      <p>Ingresa la contraseña del panel administrador.</p>
      <form className="admin-form narrow" onSubmit={submit}>
        <label htmlFor="admin-password">Contraseña</label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
        />
        {error && (
          <div className="connection-error" role="alert">{error}</div>
        )}
        <button className="primary" type="submit" disabled={busy || !password}>
          <Heart size={16} /> Entrar al panel
        </button>
      </form>
      <a href="/">Volver a la portada</a>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="access-page">
          <h1>Un momento…</h1>
        </main>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
