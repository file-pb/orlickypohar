"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Odkaz v menu, který na své vlastní stránce zmizí (Filip, 22. 9. 2026:
 * „v menu nezobrazuj možnost, na které právě stojím").
 *
 * Klientský kvůli jedinému údaji — aktuální cestě. Layout se renderuje na
 * serveru a o ní nic neví; vykreslovat hlavičku na každé stránce zvlášť by
 * byly čtyři kopie navigace, které se rozejdou. Porovnává se cesta bez
 * dotazu, takže pořadí jiné třídy (`?trida=`) je pořád táž stránka.
 *
 * `obycejny` je pro odkazy do správy, které schválně nejdou přes klientský
 * router (viz komentář v `profil.tsx`).
 */
export function OdkazJinam({
  href,
  className,
  obycejny = false,
  children,
}: {
  href: string;
  className?: string;
  obycejny?: boolean;
  children: ReactNode;
}) {
  if (usePathname() === href) return null;

  return obycejny ? (
    <a className={className} href={href}>
      {children}
    </a>
  ) : (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}
