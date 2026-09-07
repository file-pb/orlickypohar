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
            <Link href="/">Orlický pohár</Link>
            <p>Seriál závodů plachetnic na Orlické přehradě</p>
          </div>
        </header>
        <main className="obal">{children}</main>
      </body>
    </html>
  );
}
