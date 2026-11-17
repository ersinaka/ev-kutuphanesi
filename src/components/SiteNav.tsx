"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const links = [
  { href: "/", label: "Raflar" },
  { href: "/ekle", label: "Ekle" },
  { href: "/medya", label: "Medya" },
  { href: "/istatistik", label: "İstatistik" },
  { href: "/yedek", label: "Yedek" },
];

export function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.user));
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/giris");
    router.refresh();
    setSigningOut(false);
  }

  return (
    <header className="site-header">
      <nav className="site-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden>
            <span className="brand-spine" />
            <span className="brand-spine brand-spine-mid" />
            <span className="brand-spine" />
          </span>
          <span className="brand-name">Ev Kütüphanesi</span>
        </Link>

        <div className="nav-links">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link${active ? " is-active" : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
          {signedIn ? (
            <>
              <Link
                href="/profil"
                className={`nav-link${pathname.startsWith("/profil") ? " is-active" : ""}`}
              >
                Profilim
              </Link>
              <button
                type="button"
                className="nav-link nav-button"
                disabled={signingOut}
                onClick={logout}
              >
                {signingOut ? "Çıkılıyor..." : "Çıkış"}
              </button>
            </>
          ) : (
            <Link
              href="/giris"
              className={`nav-link${pathname === "/giris" ? " is-active" : ""}`}
            >
              Giriş
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
