import { requireAdmin } from "@/lib/admin-auth";
import Experience from "@/app/experience";

export const dynamic = "force-dynamic";

export default async function Preview() {
  await requireAdmin("/admin/preview");
  return <Experience preview />;
}

