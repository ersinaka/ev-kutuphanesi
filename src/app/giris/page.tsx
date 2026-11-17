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
        <h1 className="page-title">
          Kitapların
          <br />
          senin olsun
        </h1>
      </div>
      <AuthForm next={next} callbackError={params.error === "callback"} />
    </div>
  );
}
