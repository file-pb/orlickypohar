/**
 * Adresa, na kterou se píše o osobní údaje.
 *
 * <b>V konfiguraci, ne v kódu</b> — ze stejného důvodu jako
 * <c>IDENTITA_UCET_URL</c>: kdo web převezme, mění compose, ne repozitář.
 * Čte se na serveru, stránka je serverová.
 *
 * Když není vyplněná, stránka o osobních údajích o ní mlčí a pošle čtenáře
 * za pořadatelem regaty. Mlčet je lepší než napsat adresu, která nikomu
 * nechodí.
 */
export const KONTAKT_UDAJE = (process.env.KONTAKT_UDAJE ?? "").trim();
