import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileView } from "@/components/ProfileView";
import {
  getCurrentUser,
  getPublicProfile,
  listPublicComments,
  listPublicReadBooks,
} from "@/lib/dal";

export const dynamic = "force-dynamic";

type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

function isValidUsername(value: string) {
  return /^[a-z0-9_]{3,20}$/.test(value);
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  if (!isValidUsername(username)) return { title: "Profil bulunamadı" };

  try {
    const profile = await getPublicProfile(username);
    if (!profile) return { title: "Profil bulunamadı" };
    return {
      title: `${profile.display_name || profile.username} · Ev Kütüphanesi`,
      description: `@${profile.username} okuduğu kitaplar ve yorumları`,
    };
  } catch {
    return { title: "Profil bulunamadı" };
  }
}

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  if (!isValidUsername(username)) notFound();

  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  const [viewer, readBooks, comments] = await Promise.all([
    getCurrentUser(),
    listPublicReadBooks(profile.id),
    listPublicComments(profile.id),
  ]);

  return (
    <ProfileView
      profile={profile}
      readBooks={readBooks}
      comments={comments}
      isOwn={viewer?.id === profile.id}
    />
  );
}
