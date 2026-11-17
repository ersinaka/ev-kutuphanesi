import { MediaLibrary } from "@/components/MediaLibrary";
import { listMyMedia } from "@/lib/dal";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const items = await listMyMedia();
  return <MediaLibrary initialItems={items} />;
}
