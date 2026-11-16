import { lookup } from "node:dns/promises";

import { jeZkratka, precti, type Cteni } from "./souradnice.ts";

/**
 * Rozbalení zkráceného odkazu do mapy. <b>Musí to udělat server</b>: v QR
 * kódu ani ve zprávě od kamaráda nic jiného než zkratka není, a prohlížeč
 * na cizí doménu nedosáhne.
 *
 * <b>Je to požadavek, který posílá náš server ven</b>, takže má úzké
 * hranice:
 *
 * - jen na hostitele, jejichž zkratku umíme (`jeZkratka`),
 * - jen http(s) na obvyklý port a nejvýš pět přeskoků,
 * - **žádný skok na vlastní stroj ani do vnitřní sítě** (`kamSeNesmi`),
 * - **čte se jen hlavička `location`**, tělo cílové stránky se nestahuje —
 *   stačí nám adresa, na kterou to vede,
 * - osm vteřin a dost; obrazovka nesmí viset na cizí službě.
 *
 * Co to prozradí: ten, kdo zkratku vyrobil (Seznam, Google), se dozví, že
 * ji někdo rozbalil. Jinak nic — token ani cookie s požadavkem nejdou.
 */

const NEJVIC_PRESKOKU = 5;
const CEKAT_MS = 8000;

export type Rozbaleni = { adresa: string } | { chyba: string };

/**
 * Leží IPv4 adresa mimo veřejný internet? Rozsahy z RFC 1918, 6598, 5737,
 * 3927 a 2544 — tedy vlastní stroj, vnitřní síť, adresy poskytovatele
 * a bloky, které se v internetu nesměrují.
 *
 * <b>Co nerozeznám, je neveřejné.</b> Nerozumím-li zápisu, neposílám tam
 * požadavek: u odchozího volání je mlčení levnější než omyl.
 */
export function neverejnaV4(ip: string): boolean {
  const o = ip.split(".").map(Number);
  if (o.length !== 4 || o.some((c) => !Number.isInteger(c) || c < 0 || c > 255)) return true;

  const [a, b, c] = o;
  if (a === 0 || a === 10 || a === 127) return true; // tenhle stroj, smyčka, vnitřní síť
  if (a === 172 && b >= 16 && b <= 31) return true; // vnitřní síť
  if (a === 192 && b === 168) return true; // vnitřní síť
  if (a === 169 && b === 254) return true; // link-local; sem chodí i metadata cloudů
  if (a === 100 && b >= 64 && b <= 127) return true; // sdílený rozsah poskytovatelů
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // vyhrazené, dokumentace
  if (a === 198 && (b === 18 || b === 19)) return true; // měřicí rozsah
  if (a === 198 && b === 51 && c === 100) return true; // dokumentace
  if (a === 203 && b === 0 && c === 113) return true; // dokumentace
  if (a >= 224) return true; // multicast a rezervovaný zbytek včetně 255.255.255.255
  return false;
}

/** `::1` nebo `2001:db8::1` → osm čísel. `null`, když tomu zápisu nerozumím. */
function rozepisV6(ip: string): number[] | null {
  const [pred, za, navic] = ip.split("::");
  if (navic !== undefined) return null;

  const kusy = (s: string) => (s === "" ? [] : s.split(":"));
  const levy = kusy(pred);
  const pravy = za === undefined ? [] : kusy(za);
  const nuly = za === undefined ? 0 : 8 - levy.length - pravy.length;
  if (nuly < 0 || (za === undefined && levy.length !== 8)) return null;

  const vse = [...levy, ...Array<string>(nuly).fill("0"), ...pravy];
  const cisla = vse.map((s) => parseInt(s, 16));
  return cisla.length === 8 && cisla.every((n) => Number.isInteger(n) && n >= 0 && n <= 0xffff)
    ? cisla
    : null;
}

/** Totéž pro IPv6. Zápis `::ffff:127.0.0.1` se posuzuje jako ta IPv4 v něm. */
export function neverejnaV6(ip: string): boolean {
  const n = ip.toLowerCase().split("%")[0]; // `%eth0` u link-local
  if (n.includes(".")) return neverejnaV4(n.slice(n.lastIndexOf(":") + 1));

  const s = rozepisV6(n);
  if (!s) return true;

  const [a, b] = s;
  if (a === 0) return true; // `::`, `::1`, mapované i kompatibilní IPv4
  if ((a & 0xfe00) === 0xfc00) return true; // fc00::/7 — vnitřní síť
  if ((a & 0xffc0) === 0xfe80) return true; // fe80::/10 — link-local
  if ((a & 0xff00) === 0xff00) return true; // ff00::/8 — multicast
  if (a === 0x2001 && b === 0x0db8) return true; // dokumentace
  if (a === 0x0064 && b === 0xff9b) return true; // NAT64 — IPv4 v IPv6 kabátě
  return false;
}

const OBVYKLY_PORT: Record<string, string> = { "http:": "80", "https:": "443" };

/**
 * Překlad jména na adresy. <b>Je to parametr, ne pevná závislost</b>,
 * aby šla kontrola vyzkoušet bez sítě — jinak by test téhle hranice
 * závisel na tom, co zrovna vrací cizí DNS.
 */
export type Preklad = (host: string) => Promise<{ address: string; family: number }[]>;

const dnsPreklad: Preklad = (host) => lookup(host, { all: true, verbatim: true });

/**
 * Smí náš server na tuhle adresu sáhnout? Vrací důvod odmítnutí, nebo
 * `null`, když je to v pořádku.
 *
 * <b>Proč to tu je.</b> Hranice na vstupu je těsná — `jeZkratka` pustí
 * přesnou shodou čtyři hostitele — jenže zkratku na libovolnou adresu si
 * na `goo.gl` vyrobí kdokoliv, a cíl zkratky je legitimně cizí doména,
 * takže se tentýž povolovací seznam na přeskoky použít nedá. Dokud se
 * u skoku ověřoval jen protokol, stačilo poslat do pole s odkazem
 * zkratku mířící na `http://127.0.0.1:8080/`: náš server ji zavolal a na
 * obrazovku se vrátila výsledná adresa — kanál na ohmatání vnitřní sítě.
 * (CodeQL `js/request-forgery`, nález z 14. 11. 2026.)
 *
 * Hranice tedy není „kam to vede", ale **„odkud to náš server nesmí
 * tahat"**: vlastní stroj, vnitřní síť a nesměrovatelné rozsahy. Port se
 * drží na obvyklém, protože zkratka mapy jinam nevede a jiný port je
 * jenom nástroj na oťukávání služeb.
 *
 * <b>Co to nedrží:</b> jméno, které se mezi touhle kontrolou a vlastním
 * požadavkem přeloží jinam (DNS rebinding). Zavřít to jde jedině vlastním
 * spojením na už ověřenou IP; při tom, že se tělo odpovědi nečte a ven
 * jde jen adresa, to za tu složitost nestojí.
 */
export async function kamSeNesmi(
  adresa: URL,
  prelozit: Preklad = dnsPreklad,
): Promise<string | null> {
  if (adresa.protocol !== "http:" && adresa.protocol !== "https:")
    return "Zkrácený odkaz vede jinam než na web.";

  if (adresa.port !== "" && adresa.port !== OBVYKLY_PORT[adresa.protocol])
    return "Zkrácený odkaz vede na neobvyklý port; tam náš server nechodí.";

  const host = adresa.hostname.replace(/^\[|\]$/g, ""); // IPv6 nese URL v hranatých závorkách

  let adresy: { address: string; family: number }[];
  try {
    adresy = await prelozit(host);
  } catch {
    return "Hostitele z toho odkazu se nedaří přeložit.";
  }

  // Stačí jedna neveřejná: který záznam si pro spojení vybere systém,
  // neurčujeme.
  const spatna = adresy.length === 0 ||
    adresy.some((a) => (a.family === 6 ? neverejnaV6(a.address) : neverejnaV4(a.address)));

  return spatna ? "Ten odkaz vede na adresu, kam náš server nechodí." : null;
}

/**
 * Jeden pokus navíc, když spojení selže.
 *
 * <b>Proč:</b> server webu běží dlouho a drží si spojení otevřená. Když
 * ho protistrana mezitím zavře, první požadavek po pauze spadne hned —
 * ne timeoutem, ale resetem (změřeno 9. 10. 2026: úspěch za 275 ms, pak
 * po chvíli pád za 64 ms). Druhý pokus si otevře nové spojení a projde.
 * Opakuje se **jen chyba spojení**, ne odpověď serveru: na „neexistuje"
 * se ptát dvakrát nemá smysl.
 */
async function jednouZopakuj(kam: URL): Promise<Response> {
  const poslat = () =>
    fetch(kam, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(CEKAT_MS),
      // Bez hlaviček navíc: nic o přihlášeném se ven posílat nemá.
      headers: { accept: "text/html", connection: "close" },
      cache: "no-store",
    });

  try {
    return await poslat();
  } catch {
    return poslat();
  }
}

export async function rozbalZkratku(
  vstup: string,
  prelozit: Preklad = dnsPreklad,
): Promise<Rozbaleni> {
  let kam: URL;
  try {
    kam = new URL(vstup);
  } catch {
    return { chyba: "Tohle není platný odkaz." };
  }

  if (!jeZkratka(kam))
    return { chyba: "Zkrácené odkazy umím rozbalit jen z Mapy.com a Google Maps." };

  for (let skok = 0; skok < NEJVIC_PRESKOKU; skok++) {
    // Na začátku smyčky, ne až u přeskoku: pak platí jedno pravidlo —
    // každá adresa, na kterou se tenhle kód ptá, prošla touž kontrolou.
    const nesmi = await kamSeNesmi(kam, prelozit);
    if (nesmi) return { chyba: nesmi };

    let odpoved: Response;
    try {
      odpoved = await jednouZopakuj(kam);
    } catch {
      return { chyba: "Mapový server se nedaří zavolat. Zkus vložit rovnou souřadnice." };
    }

    const dal = odpoved.headers.get("location");
    if (!dal) {
      // Někde řetěz končí: buď jsme u cíle, nebo zkratka neexistuje.
      return odpoved.ok || odpoved.status === 200
        ? { adresa: kam.href }
        : { chyba: `Zkrácený odkaz nikam nevede (${odpoved.status}).` };
    }

    let dalsi: URL;
    try {
      dalsi = new URL(dal, kam);
    } catch {
      return { chyba: "Zkrácený odkaz vede na nesrozumitelnou adresu." };
    }

    kam = dalsi;
  }

  return { chyba: "Zkrácený odkaz se přesměrovává pořád dokola." };
}

/**
 * Celé čtení tak, jak ho potřebuje obrazovka: co jde přečíst rovnou, se
 * přečte, a zkratka se nejdřív rozbalí. <b>Běží na serveru</b>, protože
 * rozbalení je odchozí požadavek.
 *
 * Vrací i `odkud`, tedy adresu po rozbalení — člověk má vidět, kam ta
 * zkratka doopravdy vedla, než podle ní postaví bóji.
 */
export async function prectiISeZkratkou(
  vstup: string,
): Promise<Cteni & { odkud?: string }> {
  const prvni = precti(vstup);
  if (prvni.stav !== "zkratka") return prvni;

  const rozbalene = await rozbalZkratku(prvni.adresa);
  if ("chyba" in rozbalene) return { stav: "nic", duvod: rozbalene.chyba };

  const druhe = precti(rozbalene.adresa);
  // Zkratka rozbalená na něco, z čeho poloha nejde — a druhé kolo by
  // vedlo do nekonečna, takže se tu končí.
  if (druhe.stav === "zkratka")
    return { stav: "nic", duvod: "Ten odkaz vede na další zkratku a to už nerozplétám." };

  return { ...druhe, odkud: rozbalene.adresa };
}
