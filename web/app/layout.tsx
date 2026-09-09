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
              <img src="/logo.png" alt="" width={34} height={34} />
              Orlický pohár
            </Link>
            <p>
              Seriál závodů plachetnic na Orlické přehradě ·{" "}
              <Link href="/pravidla">pravidla</Link> · <Link href="/appka">appka</Link>
            </p>
          </div>
        </header>
        <main className="obal">{children}</main>
      </body>
    </html>
  );
}
