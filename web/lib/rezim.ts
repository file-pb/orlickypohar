/**
 * Vzhled webu zvolený ručně: světlý, nebo tmavý (Filip, 16. 9. 2026).
 *
 * Bez cookie se web řídí systémem čtenáře. Cookie volbu přebije a layout
 * ji napíše do `<html data-rezim>`, takže stránka přijde ze serveru rovnou
 * ve správné barvě a nebliká.
 */
export const COOKIE_REZIM = "op_rezim";

export type Rezim = "svetly" | "tmavy";

export const jeRezim = (hodnota?: string | null): hodnota is Rezim =>
  hodnota === "svetly" || hodnota === "tmavy";
