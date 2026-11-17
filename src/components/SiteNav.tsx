"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Raflar" },
  { href: "/ekle", label: "Ekle" },
  { href: "/istatistik", label: "İstatistik" },
  { href: "/yedek", label: "Yedek" },
];

export function SiteNav() {
  const pathname = usePathname();

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
        </div>
      </nav>
    </header>
  );
}
