import { AddBookPanel } from "@/components/AddBookPanel";
import { requireUser } from "@/lib/dal";

export const dynamic = "force-dynamic";

export default async function AddBookPage() {
  await requireUser();
  return <AddBookPanel />;
}
