import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Orlický pohár", template: "%s — Orlický pohár" },
  description: "Seriál závodů plachetnic na Orlické přehradě.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body>
        <header className="hlavicka">
          <div className="obal">
            {/* Značka je tatáž jako ikona appky — kreslí ji app/scripts/ikona.py,
                aby existovala jedna, ne dvě podobné. */}
            <Link className="znacka" href="/">
              <img src="/logo.png" alt="" width={30} height={30} />
              Orlický pohár
            </Link>
            {/* Podtitulek tu byl nadbytečný — totéž stojí hned pod fotkou. */}
            <nav>
              <Link href="/pravidla">Pravidla</Link>
              <Link href="/appka">Appka</Link>
            </nav>
          </div>
        </header>
        <main className="obal">{children}</main>
      </body>
    </html>
  );
}
