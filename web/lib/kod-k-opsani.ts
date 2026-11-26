/**
 * Kód k napojení appky v podobě, ve které se opisuje z obrazovky.
 *
 * <b>Vlastní modul, a ne řádek v `lib/klice-uctu.ts`.</b> Ten si veze
 * sezení a `@/`-aliasy, takže se z testu bez bundleru naimportovat nedá —
 * a tahle funkce je přitom to jediné na celé té cestě, co se dá rozhodnout
 * bez serveru.
 */

/**
 * Kód po čtveřicích, spojený **nezlomitelnou** mezerou.
 *
 * Osm znaků v jednom bloku se z obrazovky opisuje po jednom a člověk
 * ztrácí místo; `JKM6 2Q7P` se přečte na dva pohledy. Mezera musí být
 * nezlomitelná: s obyčejnou se kód na úzké obrazovce zlomí na konci řádku
 * a přístupový údaj se opisuje po částech ze dvou řádků.
 *
 * Do QR jde dál holý kód a mezeru server při čtení zahodí
 * (`KliceUctuSprava.Uprav`), takže opsat se dá i s ní.
 */
export const kodKOpsani = (kod: string) =>
  (kod.match(/.{1,4}/g) ?? [kod]).join("\u00a0");
