/**
 * Stav nádrže Orlík z portálu Povodí Vltavy (Filip, 16. 9. 2026): hladina,
 * přítok, odtok a hodinová řada hladiny pro graf.
 *
 * <b>Čte se HTML stránka, ne API.</b> Povodí Vltavy data jinak nevydává.
 * Stránka má dvě tabulky, na kterých to stojí: „Aktuální hodnoty" a řadu
 * s hlavičkou „Datum". Kdyby se tvar změnil, rozbor vrátí `null` a widget
 * se prostě neukáže — kvůli vodočtu nesmí spadnout stránka.
 *
 * <b>Stahuje se nejvýš jednou za půl hodiny.</b> Měření přibývají po
 * hodině, častější dotazy by jen zatěžovaly cizí server.
 */

import https from "node:https";
import tls from "node:tls";
import { unstable_cache } from "next/cache";

export const ZDROJ_VODOCTU ="https://www.pvl.cz/portal/nadrze/cz/pc/Mereni.aspx?id=VLOR&oid=2";

export type Mereni = { cas: string; hladina: number };

export type StavNadrze = {
  /** Čas aktuálních hodnot, jak ho uvádí zdroj: „16.09.2026 00:10". */
  cas: string;
  /** Hladina v m n. m. */
  hladina: number;
  /** m³/s */
  pritok: number | null;
  /** m³/s */
  odtok: number | null;
  /** Hodinová řada hladiny od nejstaršího měření. */
  historie: Mereni[];
};

const ENTITY: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"' };

const text = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&([a-z]+);/gi, (cela, nazev) => ENTITY[nazev.toLowerCase()] ?? cela)
    .replace(/\s+/g, " ")
    .trim();

/** „334,72" → 334.72; prázdná buňka nebo nesmysl → null. */
const cislo = (s?: string) => {
  const cisty = (s ?? "").replace(/\s/g, "").replace(",", ".");
  if (!cisty) return null;
  const n = Number(cisty);
  return Number.isFinite(n) ? n : null;
};

/** Tabulky stránky jako řádky buněk s čistým textem. */
const tabulky = (html: string) =>
  [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((t) =>
    [...t[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((r) =>
      [...r[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => text(c[1])),
    ),
  );

const CAS = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/;

/**
 * Čas měření na minuty, pro výpočty rozdílů. Pásmo je jedno — všechny
 * časy jsou ze stejného zdroje ve stejném pásmu, porovnávají se jen mezi
 * sebou.
 */
export const minuty = (cas: string) => {
  const m = cas.match(CAS);
  return m ? Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]) / 60_000 : Number.NaN;
};

/**
 * Řada na stránce má dvě části: měření po hodinách za poslední den a pod
 * nimi denní hodnoty v 7:00 za týden zpátky. Graf i změna berou jen
 * hodinovou část — s denními body by osa byla nerovnoměrná a „změna za
 * 6 h" by porovnávala s jiným dnem.
 */
const OKNO_HODIN = 24;

export function rozeberStranku(html: string): StavNadrze | null {
  const vse = tabulky(html);
  const aktualni = vse.find((t) => t[0]?.some((c) => /^Aktu/.test(c)));
  if (!aktualni) return null;

  const hodnota = (popisek: RegExp) => cislo(aktualni.find((r) => popisek.test(r[0] ?? ""))?.[1]);
  const hladina = hodnota(/^Hladina/);
  if (hladina === null) return null;

  const rada = vse.find((t) => t[0]?.includes("Datum")) ?? [];
  const vsechna = rada
    .slice(1)
    .map((r) => ({ cas: r[0] ?? "", hladina: cislo(r[1]) }))
    .filter((m): m is Mereni => CAS.test(m.cas) && m.hladina !== null)
    .reverse();
  const posledni = vsechna.length ? minuty(vsechna[vsechna.length - 1].cas) : 0;
  const historie = vsechna.filter((m) => posledni - minuty(m.cas) <= OKNO_HODIN * 60);

  // Čas je v hlavičce „Aktuální hodnoty (16.09.2026 00:10)"; mezi závorkami
  // a datem může být kvůli značkám v HTML mezera.
  const casAktualnich = aktualni[0].join(" ").match(/\(\s*(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2})\s*\)/);

  return {
    cas: casAktualnich ? `${casAktualnich[1]} ${casAktualnich[2]}` : "",
    hladina,
    // „Přítok" se v HTML může psát entitou, proto ne doslova.
    pritok: hodnota(/^P\S{0,6}tok/),
    odtok: hodnota(/^Odtok/),
    historie,
  };
}

/**
 * Mezilehlý certifikát, který server Povodí Vltavy neposílá.
 *
 * Jejich certifikát vydala „Alpiro RSA DV SSL CA 2", ale server k němu
 * přikládá jinou mezilehlou autoritu („AlpiroSSL RSA DV CA"). Prohlížeče
 * a curl na Macu si chybějící článek dohledají samy, Node ne — spojení
 * odmítne s UNABLE_TO_VERIFY_LEAF_SIGNATURE a widget by na produkci tiše
 * chyběl. Zjištěno 16. 9. 2026.
 *
 * Kontrola certifikátu tím zůstává zapnutá: přidává se jen tenhle jeden
 * článek ke kořenům, které Node zná. Stažený z adresy uvedené přímo
 * v certifikátu serveru (http://crt.sectigo.com/AlpiroRSADVSSLCA2.crt),
 * vydal ho kořen Sectigo Public Server Authentication Root R46, platí do
 * 26. 3. 2035. SHA-256 CD:FB:B4:78:82:81:8B:69:4A:AD:81:8C:D8:04:0D:D1:
 * 10:50:19:7F:51:DD:BF:3C:2E:B0:98:12:E4:A2:5D:F5.
 *
 * Až PVL certifikát vymění za jiného vydavatele, stažení selže a widget
 * zmizí; oprava je vyměnit tenhle text.
 */
const ALPIRO_RSA_DV_SSL_CA_2 = `-----BEGIN CERTIFICATE-----
MIIGITCCBAmgAwIBAgIRAKZyV9GJog2rQ/Aa84oDN+AwDQYJKoZIhvcNAQEMBQAw
XzELMAkGA1UEBhMCR0IxGDAWBgNVBAoTD1NlY3RpZ28gTGltaXRlZDE2MDQGA1UE
AxMtU2VjdGlnbyBQdWJsaWMgU2VydmVyIEF1dGhlbnRpY2F0aW9uIFJvb3QgUjQ2
MB4XDTI1MDMyNzAwMDAwMFoXDTM1MDMyNjIzNTk1OVowRjELMAkGA1UEBhMCQ1ox
FjAUBgNVBAoTDUFscGlybyBzLnIuby4xHzAdBgNVBAMTFkFscGlybyBSU0EgRFYg
U1NMIENBIDIwggGiMA0GCSqGSIb3DQEBAQUAA4IBjwAwggGKAoIBgQDUx47MPW7Y
BVt2znX2Y8FbnYTLLajF9b4WYVcBK3IojDSeNONXkVvjMIi4koo570V4DBlrhugp
XKB6YFj4X9zJ25vXNOG5KckxIwXEHAQCgxm2yE04abViDCIMIrQvJO04dCgfrqwE
kdyGxyOT0Mt2YHUGeBUlsUg3Pnp8fuVc9bCk6CsPkQ/WdaRWnHP5uOG7VQBXpa58
ZIQYAmJTh4AwLGGRT3mnMlvXDICDJP6SiHISGzYEmq2Z/WdQuKP3G9z4tHOKcjo6
AGNCRs+pDaFyqLHZjc9w/ksrypUh6XYA4xGsmReRFYOppVVdj77O2w9b1tAucpe6
p1GFXAYcHwtEkEznV+skxFG3VCn96gK0AMiSfvF2kOSok8g+0n4eFOnyz4U7hM3n
JLIh3dxJeax3IAZb/FLJHxMu+0Bb/6LIFv7kRmM3YMIWY9fQAZ3qwVBA1OQjmDNs
ZqQ4Bcjuf7b6462ingkX2LscilNBPmQl3iRVflzvc+uPYblwd249uPkCAwEAAaOC
AW8wggFrMB8GA1UdIwQYMBaAFFZzWGSV+ZIasBIqBGJ5oUAViCFJMB0GA1UdDgQW
BBR1CNT4yIybtYpS46aNIt7KR4u2fTAOBgNVHQ8BAf8EBAMCAYYwEgYDVR0TAQH/
BAgwBgEB/wIBADATBgNVHSUEDDAKBggrBgEFBQcDATATBgNVHSAEDDAKMAgGBmeB
DAECATBUBgNVHR8ETTBLMEmgR6BFhkNodHRwOi8vY3JsLnNlY3RpZ28uY29tL1Nl
Y3RpZ29QdWJsaWNTZXJ2ZXJBdXRoZW50aWNhdGlvblJvb3RSNDYuY3JsMIGEBggr
BgEFBQcBAQR4MHYwTwYIKwYBBQUHMAKGQ2h0dHA6Ly9jcnQuc2VjdGlnby5jb20v
U2VjdGlnb1B1YmxpY1NlcnZlckF1dGhlbnRpY2F0aW9uUm9vdFI0Ni5wN2MwIwYI
KwYBBQUHMAGGF2h0dHA6Ly9vY3NwLnNlY3RpZ28uY29tMA0GCSqGSIb3DQEBDAUA
A4ICAQBQPX41avzHSSAVaFJPCr6GLxgeqj5XSl5GflqEZYnUMi11ZFb5R0DBEHIE
ec/Og7pgUi3ehKt1OZ4hbjhrkhdNqYY260Go4Jf5XxmVLSHz1k1A6q+biCLo2eh1
w8/TeTLus4opPh7VQHzYAYvHopiaof/QPoJlZFGvquzlnSA94Ffukse1fV+c3Xhz
niz3wcf/bkTETz3C3cq2/0GJi0SIIoYMVbL0bLrZvO4REvYKk9dfozMBijIo1NDd
sYQR79DplE3jzycMcGoVsJa2FFRF9N9qCkmFQ4x5BjRYR0NcJXqupV/aFU80ud39
H0ZZOHNAQryjw+3YTK2gh6YT1iklUbtX2hNL4PwSnu0LPipyzK9smCY9P6BlSOd+
gj6pUW/7d7I6hBnwpyk+/iZNFH4ViOMrmOJGiY5lJbH6TOP9e/FbiK51NTK4NPoE
RvxyaKDpbIfZgi7AZGmAG3vQW2h+kugixbhK7z7qTkKOG9JTuHV7Px/xqIB6Wgse
ddqZCVdZQamPCMtwdtZe7zG9Y7F8VBH5/78hsI7yqn3MRH1JPhlOrth17fyxR+dK
iLg2lctsv/v2MpDcR/rhASt3TUbTDjT/VnS9/+xPoxl352FHBnME4D7puZWCt+d1
OING0BUMXPhKecUb3wu27AtmJ06Cfuinj3ifnqfqP4xh5ZFEWQ==
-----END CERTIFICATE-----`;

const CA = [...tls.rootCertificates, ALPIRO_RSA_DV_SSL_CA_2];

/**
 * Stránka jako text, nebo výjimka. Přes `https`, ne `fetch`: jen tady jde
 * přidat mezilehlý certifikát k jednomu požadavku, aniž by se sahalo na
 * důvěru celého procesu.
 */
function stahni(): Promise<string> {
  return new Promise((hotovo, chyba) => {
    const pozadavek = https.get(
      ZDROJ_VODOCTU,
      {
        ca: CA,
        timeout: 6000,
        headers: { "user-agent": "OrlickyPohar/1.0 (+https://orlickypohar.klihovka.cz)" },
      },
      (odpoved) => {
        if (odpoved.statusCode !== 200) {
          odpoved.resume();
          return chyba(new Error(`PVL odpovědělo ${odpoved.statusCode}`));
        }
        odpoved.setEncoding("utf8");
        let telo = "";
        odpoved.on("data", (kus) => (telo += kus));
        odpoved.on("end", () => hotovo(telo));
      },
    );
    pozadavek.on("timeout", () => pozadavek.destroy(new Error("PVL neodpovědělo včas")));
    pozadavek.on("error", chyba);
  });
}

/**
 * Stažení a rozbor, uložené v cache Next na půl hodiny. Nepovedené stažení
 * i nečitelná stránka vyhodí výjimku, a ta se do cache neuloží — další
 * načtení to zkusí znovu, místo aby půl hodiny držela prázdno.
 */
const nactiOrlikDoCache = unstable_cache(
  async () => {
    const stav = rozeberStranku(await stahni());
    if (!stav) throw new Error("Stránka PVL nemá očekávaný tvar");
    return stav;
  },
  ["vodocet-orlik"],
  { revalidate: 1800 },
);

export async function nactiOrlik(): Promise<StavNadrze | null> {
  try {
    return await nactiOrlikDoCache();
  } catch {
    return null;
  }
}

/**
 * Změna hladiny v centimetrech za `hodin` hodin: proti měření, které je
 * časem nejblíž okamžiku před `hodin` hodinami. Podle času, ne podle
 * pořadí řádků — nejnovější měření bývá v 00:10 hned za 00:00.
 */
export function zmenaCm(historie: Mereni[], hodin = 6) {
  if (historie.length < 2) return 0;
  const posledni = historie[historie.length - 1];
  const cil = minuty(posledni.cas) - hodin * 60;
  const drive = historie.reduce((nejbliz, m) =>
    Math.abs(minuty(m.cas) - cil) < Math.abs(minuty(nejbliz.cas) - cil) ? m : nejbliz,
  );
  return Math.round((posledni.hladina - drive.hladina) * 100);
}
