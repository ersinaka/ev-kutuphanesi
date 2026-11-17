import { ProfileView } from "@/components/ProfileView";
import {
  getMyProfile,
  listPublicComments,
  listPublicReadBooks,
  requireUser,
} from "@/lib/dal";

export const dynamic = "force-dynamic";

export default async function MyProfilePage() {
  const user = await requireUser();
  const profile = await getMyProfile();

  if (!profile) {
    return (
      <p className="alert alert-error">
        Profil bulunamadı. Lütfen çıkış yapıp tekrar giriş yap.
      </p>
    );
  }

  const [readBooks, comments] = await Promise.all([
    listPublicReadBooks(user.id),
    listPublicComments(user.id),
  ]);

  return (
    <ProfileView
      profile={profile}
      readBooks={readBooks}
      comments={comments}
      isOwn
    />
  );
}
