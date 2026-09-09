"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Odkaz „Domů", který na domovské stránce zmizí.
 *
 * Je to jediná klientská komponenta v hlavičce a je to vědomá cena: layout
 * se renderuje na serveru a o aktuální cestě nic neví. Alternativou by bylo
 * vykreslovat hlavičku na každé stránce zvlášť, což je horší — čtyři kopie
 * navigace, které se rozejdou.
 */
export function Domu() {
  return usePathname() === "/" ? null : <Link href="/">Domů</Link>;
}
