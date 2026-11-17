import { ProfileView } from "@/components/ProfileView";
import {
  getMyProfile,
  listMyBooks,
  listPublicComments,
  listPublicReadBooks,
  requireUser,
} from "@/lib/dal";
import type { Book } from "@/lib/types";

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

  let backupBooks: Book[] = [];
  try {
    backupBooks = await listMyBooks();
  } catch {
    // The profile still works if the backup list cannot be loaded.
  }

  return (
    <ProfileView
      profile={profile}
      readBooks={readBooks}
      comments={comments}
      isOwn
      backupBooks={backupBooks}
    />
  );
}
