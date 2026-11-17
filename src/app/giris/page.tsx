import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/dal";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  if (user) redirect("/");

  const next =
    params.next?.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/";

  return (
    <div className="auth-layout">
      <div className="page-copy">
        <p className="eyebrow">kütüphane defteri</p>
        <h1 className="page-title">
          Kitapların
          <br />
          senin olsun
        </h1>
        <p className="page-lead">
          Giriş yap, kendi rafını kur; okudukların ve yorumların profilinde
          görünsün.
        </p>
      </div>
      <AuthForm next={next} callbackError={params.error === "callback"} />
    </div>
  );
}
