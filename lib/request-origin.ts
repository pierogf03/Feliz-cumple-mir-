function normalizeHostname(hostname: string) {
  const h = hostname.toLowerCase();
  if (h === "127.0.0.1" || h === "localhost" || h === "::1" || h === "[::1]") {
    return "localhost";
  }
  return h;
}

/** Alinea Origin con Host (necesario al usar la IP de la red en `next dev`). */
export function isAllowedRequestOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  try {
    const from = new URL(origin);
    const host = req.headers.get("host");
    if (host && from.host === host) return true;

    const requestUrl = new URL(req.url);
    if (from.origin === requestUrl.origin) return true;

    if (process.env.NODE_ENV !== "production") {
      const port = from.port || host?.split(":")[1] || requestUrl.port || "3000";
      const a = normalizeHostname(from.hostname);
      const b = normalizeHostname(
        host?.split(":")[0] ?? requestUrl.hostname,
      );
      if (a === b) return true;
      if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(a) && a === b) return true;
      const fromPort = from.port || port;
      const hostPort = host?.includes(":") ? host.split(":")[1] : port;
      return fromPort === hostPort && a === b;
    }

    return false;
  } catch {
    return false;
  }
}
