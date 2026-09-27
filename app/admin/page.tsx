import { requireAdmin } from "@/lib/admin-auth";
import Admin from "./panel";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireAdmin("/admin");
  return <Admin />;
}

