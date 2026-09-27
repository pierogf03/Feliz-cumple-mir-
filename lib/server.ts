import {
  clearAdminSession,
  createSessionToken,
  isAdmin,
  setAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import { isAllowedRequestOrigin } from "@/lib/request-origin";
import { bucket } from "@/lib/storage";
import { defaultReasons, type Content, type Settings } from "./content";
import * as store from "./store";

export {
  isAdmin,
  createSessionToken,
  setAdminSession,
  clearAdminSession,
  verifyAdminPassword,
};
export { bucket };
export {
  ensureStore,
  saveSettings,
  upsertMemory,
  deleteMemory,
  reorderMemories,
  upsertTimeline,
  deleteTimeline,
  reorderTimeline,
  upsertReason,
  deleteReason,
  reorderReasons,
  registerAsset,
  isMediaUrlPublic,
} from "./store";

export async function authorize(req: Request) {
  if (!(await isAdmin()))
    return Response.json(
      { error: "No tienes permiso para editar este rincón." },
      { status: 403 },
    );
  if (!isAllowedRequestOrigin(req))
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  return null;
}

export async function getSettings(): Promise<Settings> {
  return store.getSettings();
}

export async function getContent(admin = false): Promise<Content> {
  await store.ensureStore();
  const settings = await store.getSettings();
  const serverTime = Date.now();
  const unlocked = serverTime >= Date.parse(settings.birthday_date);
  if (!admin && !unlocked)
    return {
      settings: { ...settings, letter_content: "", audio_url: "" },
      serverTime,
      unlocked,
      memories: [],
      timeline: [],
      reasons: [],
    };
  const configured = await store.hasConfiguredReasons();
  return {
    settings,
    serverTime,
    unlocked,
    memories: await store.listMemories(admin),
    timeline:
      settings.timeline_enabled || admin ? await store.listTimeline() : [],
    reasons: configured ? await store.listReasons() : defaultReasons,
  };
}

export const responseHeaders = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function removeUnreferenced(urls: string[]) {
  const settings = await store.getSettings();
  for (const url of new Set(urls)) {
    if (!/^\/api\/media\/[a-f0-9-]{36}$/.test(url)) continue;
    if (await store.isMediaUrlReferenced(url, settings)) continue;
    const id = url.split("/").pop()!;
    await bucket().delete(id).catch(() => {});
    await store.removeAsset(id);
  }
}
