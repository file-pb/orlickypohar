/**
 * Místní čas Orlíku → okamžik.
 *
 * <b>Vlastní modul, ne kus formuláře.</b> Pole `datetime-local` pošle
 * „2027-05-15T10:55" bez pásma, a co to znamená za okamžik, rozhoduje čas
 * Orlíku — ne prohlížeč pořadatele, který může jet na dovolené v jiném
 * pásmu, a už vůbec ne server, který jede v UTC
 * (`deploy/docker-compose.yml` žádné `TZ` nenastavuje). Je to pravidlo se
 * dvěma pastmi, takže má testy (`web/testy/cas-praha.test.ts`).
 *
 * <b>Posun se počítá k tomu dni</b>, ne k dnešku: vypsání se píše v zimě na
 * květnový závod, a napevno zapsané +01:00 by start posunulo o hodinu.
 */
const PASMO = "Europe/Prague";

/**
 * Z `YYYY-MM-DDTHH:mm` v čase Orlíku udělá ISO okamžik v UTC.
 *
 * Vrací `null` pro prázdný nebo nesmyslný vstup — formulář nemá čím
 * doložit, co člověk myslel, a dosazený čas startu je horší než žádný.
 */
const TVAR = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function okamzikZMistniho(mistni: string | null | undefined): string | null {
  // <b>Tvar se kontroluje regulárem, ne jen `NaN`.</b> `new Date` je
  // v prohlížeči i v nodu podezřele shovívavá: z „tohle není datum:00Z"
  // udělá 1. ledna 2000. Formulář posílá `datetime-local`, tedy přesně
  // tenhle tvar — co se mu nepodobá, není překlep, ale nedorozumění.
  if (!mistni || !TVAR.test(mistni)) return null;

  // Nejdřív se ten zápis vezme, jako by byl v UTC. Týž okamžik se pak
  // přečte v Praze a zase naoko jako UTC — rozdíl těch dvou je přesně
  // posun pásma k tomu dni: v květnu dvě hodiny, v lednu jedna.
  const naoko = new Date(`${mistni}:00Z`);
  if (Number.isNaN(naoko.getTime())) return null;

  // <b>Přes `Intl`, ne přes `toLocaleString` a `new Date`.</b> Ten druhý
  // způsob čte výsledek v pásmu stroje, takže na pražském notebooku vyjde
  // posun nula a na serveru v UTC správně — chyba, která se na vývoji
  // neukáže.
  const posun = naoko.getTime() - Date.parse(`${vPasmu(naoko)}Z`);

  return new Date(naoko.getTime() + posun).toISOString();
}

/** Tentýž okamžik, jak ho čte Orlík, ve tvaru `YYYY-MM-DDTHH:mm:ss`. */
function vPasmu(kdy: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: PASMO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(kdy)
    .replace(" ", "T");
}

/**
 * Opačný směr: z okamžiku udělá `YYYY-MM-DDTHH:mm` v čase Orlíku, jak ho
 * čeká `datetime-local`. Bez toho by formulář ukázal čas serveru.
 */
export function mistniZOkamziku(iso: string | null | undefined): string {
  if (!iso) return "";

  const kdy = new Date(iso);
  if (Number.isNaN(kdy.getTime())) return "";

  const casti = new Intl.DateTimeFormat("sv-SE", {
    timeZone: PASMO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(kdy);

  // `sv-SE` dává „2027-05-15 10:55"; formulář chce „T" místo mezery.
  return casti.replace(" ", "T");
}
