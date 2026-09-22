import { OdkazJinam } from "@/app/odkaz-jinam";

/** Odkaz „Domů", který na domovské stránce zmizí — viz `OdkazJinam`. */
export function Domu() {
  return <OdkazJinam href="/">Domů</OdkazJinam>;
}
