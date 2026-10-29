import Link from "next/link";
import type { VerejnaTrat, ZavodDetail } from "@/lib/api";
import { Drobecky } from "@/app/drobecky";
import { ZnackaPuvodni } from "@/app/logo-puvodni";
import { VlajkaIkona, type Vlajka } from "@/app/vlajky";
import { nactiJa } from "@/lib/ja";
import { polozkyZastavky, prava, roleVRocniku } from "@/lib/co-smim";
import { nactiBlesky } from "@/lib/blesky";
import { DoSpravy, Hlavicka } from "./hlavicka";
import { jedeSeDnes, Upozorneni, upozorneniZastavky } from "./upozorneni";
import { DlazdiceSekci } from "@/app/prepinac-sekci";

/**
 * Hlava stránky regaty: cesta, název, co je nového a taby sekcí.
 *
 * <b>Proč sekce místo jednoho svitku</b> (Filip, 11. 10. 2026: *„Člověk se
 * potřebuje pohybovat ve struktuře… Ne vše najednou"*). Dřív byla regata
 * jedna stránka s osmi nadpisy za sebou, mezi nimi podmínky podle stavu —
 * čtenář nikdy neviděl celek a nepoznal, co ještě přijde. Taby ten celek
 * ukážou i tehdy, když je otevřená jen jedna část.
 *
 * <b>Každá sekce má vlastní adresu</b>, ne přepínač na jedné stránce (plán,
 * oddíl *Úvodník a taby*): posílají se na ně odkazy a mikrocache před webem
 * drží každou adresu zvlášť, takže telefon u vody stáhne jen svůj kus.
 * Z toho plyne i to hlavní: otevřená sekce si načte jen svoje data.
 *
 * <b>Na úzkém displeji je z tabů rozbalovátko</b> (Filip, 24. 10. 2026:
 * *„u malých rozměrů bych raději tab předělal něco jako akordeon, protože
 * tab se na šířku nevejde"*). Změřeno na `jarni-vitr` při 375 px: pruh má
 * 551 px obsahu v 335 px místa, takže **ze pěti sekcí jsou vidět tři** a
 * posuvník je schovaný — na Lodě a Výsledky nevede cesta. Pod 40 rem (640 px,
 * kde se pruh ještě vejde) je proto místo pruhu jeden řádek s otevřenou
 * sekcí, který se rozbalí na celý seznam. Obsah zůstává po adresách;
 * akordeon je výběr, ne sloučení sekcí do jedné stránky.
 *
 * <b>Taby nejsou nabídka odkazů, ale obsah stránky.</b> Proto tu sekce
 * stojí i prázdná (lodě u regaty, kam se ještě nikdo nehlásil) — že je
 * prázdná, je taky odpověď. Chybí jen to, co u téhle regaty nedává smysl:
 * směrnice, která není vyvěšená, trať, která není přijatá, a u komunitní
 * akce výsledky a lodě, které nikdy nebudou.
 */

 export type Sekce = "uvod" | "vypsani" | "smernice" | "trat" | "lode" | "vysledky";

/**
 * <b>Pojmenované podle rozhodčího</b> (Filip, 27. 10. 2026: *„Podívej
 * jestli se nám to nejmenuje jinak a pojmenuj to podle Miloše"*, a k tabu
 * `lode` rovnou: *„To bude startovní listina"*). Miloš Zvonař jmenoval,
 * co je na stránce regaty potřeba vidět před závodem, a sekce lodí se
 * jmenovala `Lodě` — slovo, které neříká, jestli jde o proces přihlášek,
 * nebo o hotový dokument k danému dni. Nález R10 v
 * `docs/OPONENTURA-ROZHODCI.md`.
 *
 * <b>Přejmenování samo nestačilo</b>, protože sekce vypisovala i lodě
 * čekající na potvrzení a vyloučené — proto se s názvem změnil i obsah,
 * viz `sekce-lode.tsx`.
 */
const NAZVY: Record<Sekce, string> = {
  uvod: "Úvod",
  // <b>Celým jménem, jak je říká Miloš</b> (Filip, 29. 10. 2026: „to je
  // pravda a tak to pojmenuj, když to tak chce"). Do 28. 10. tu stály
  // zkratky „Vypsání", „Směrnice" a „Trať" s plným názvem až v nadpisu
  // sekce (nález R8) — kvůli šířce pruhu, což byla věcná námitka u R10.
  //
  // <b>Na užším monitoru se pruh zalomí</b>, a je to tak správně. Šest celých
  // jmen potřebuje 935 px a střed stránky tolik má až od okna 1560 px, protože
  // boky jsou grid `16rem | 1fr | 16rem` — pod tím jsou dva řádky, viz
  // `.taby-sekci` v `globals.css`. Zkratka by ušetřila řádek a stála jméno.
  // Pod 40 rem se místo něj skládá akordeon, tam je jméno na vlastním řádku.
  //
  // Zkrácení Filip připustil („nějakou zkrácenou formu asi můžeš, když budeš
  // muset, ale vychází to z Miloše"), ale potřeba není a stálo by dvojí
  // jméno pro tutéž sekci — a jednotné pojmenování je zrovna to, oč šlo.
  // Zkratka taky stála jednu nesrovnalost: v tabu bylo jiné slovo než
  // v nadpisu, na který vedl.
  vypsani: "Vypsání závodu",
  smernice: "Plachetní směrnice",
  trat: "Závodní trať",
  lode: "Startovní listina",
  vysledky: "Výsledky",
};

/**
 * Signální vlajka u každé sekce (Filip, 11. 10. 2026: *„ať je to živější"*).
 * Vybraná podle toho, co vlajka doopravdy znamená v Závodních signálech —
 * proč a která, viz `app/vlajky.tsx`. Úvod vlajku nemá: žádný signál
 * neznamená „tady je řeč o celé regatě", a tak nese značku poháru, stejně
 * jako ji v tabech tříd nese pořadí celého pole.
 */
const VLAJKY: Record<Sekce, Vlajka | null> = {
  uvod: null,
  // <b>Vypsání vlajku nemá</b>, a ze stejného důvodu jako Úvod: žádný
  // závodní signál neznamená „tady se vypisuje závod" — vypsání se vydává
  // týdny předem na břehu. Vymyslet mu vlajku by rozbilo přesně tu
  // znalost, kvůli které vlajky u tabů jsou (`app/vlajky.tsx`).
  vypsani: null,
  smernice: "L",
  trat: "M",
  lode: "P",
  vysledky: "modra",
};

/** Které sekce ta která regata má. Pořadí je pořadí tabů. */
function sekce(zavod: ZavodDetail, trat: VerejnaTrat | null, akce: boolean): Sekce[] {
  if (akce) return ["uvod"];

  return [
    "uvod",
    // <b>Vypsání má regata vždycky, i neúplné</b> (nálezy R1 a R8,
    // 28. 10. 2026). ZPJ 25.1 je chtějí dostupné každé lodi dřív, než se
    // přihlásí, a Miloš je jmenuje jako první položku pro obě publika —
    // přihlášené i nepřihlášené. Dokument, kterému něco chybí, to o sobě
    // řekne, a to je taky odpověď; sekce schovaná do té doby, než bude
    // úplná, by neřekla nic.
    "vypsani",
    ...((zavod.smernice?.length ?? 0) > 0 ? (["smernice"] as const) : []),
    ...(trat ? (["trat"] as const) : []),
    "lode",
    // Výsledky i u ročníku, který je nevydává. Sekce tam není proto, že by
    // v ní byla tabulka, ale proto, aby se nemlčelo: „vznikaly ručně, platí
    // pořadí seriálu" je odpověď, a bez tabu by na ni nevedla cesta —
    // přesně ta vada, kterou Filip našel u tabule (10. 10. 2026).
    "vysledky",
  ];
}

export function adresaSekce(serie: string, zavod: string, s: Sekce) {
  const zaklad = `/serie/${serie}/zavody/${zavod}`;
  return s === "uvod" ? zaklad : `${zaklad}/${s}`;
}

export async function HlavaZastavky({
  serie,
  zavod,
  detail,
  trat,
  aktivni,
}: {
  serie: string;
  zavod: string;
  detail: ZavodDetail;
  trat: VerejnaTrat | null;
  aktivni: Sekce;
}) {
  const akce = detail.druh === "Akce";

  // Cesta do správy rovnou odsud, když na to člověk má práva. Na cache to
  // vliv nemá, viz `DoSpravy`.
  const { ja } = await nactiJa();
  const udelena = prava(ja);
  const maRoli = roleVRocniku(udelena, serie).length > 0;
  // Komunitní akce výsledky ani přihlášky nemá; vede z ní jen rozcestník.
  const prace = akce ? [] : polozkyZastavky(udelena, serie, zavod);

  const moje = sekce(detail, trat, akce);

  // Blesky se tahají jen v den regaty. Mimo něj je to zbytečné volání ven
  // u každé stránky, kterou si někdo otevře kvůli loňským výsledkům —
  // a informace, kterou nikdo nepotřebuje. Výpadek zdroje řeší `nactiBlesky`
  // sám tím, že vrátí null, a upozornění pak chybí.
  const blesky = jedeSeDnes(detail) ? await nactiBlesky() : null;

  const upozorneni = upozorneniZastavky(
    detail,
    trat,
    {
      trat: adresaSekce(serie, zavod, "trat"),
      tabule: `/serie/${serie}/zavody/${zavod}/tabule`,
      prihlaska: `/serie/${serie}/zavody/${zavod}/prihlaska`,
      smernice: adresaSekce(serie, zavod, "smernice"),
    },
    blesky,
  );

  return (
    <>
      <Drobecky
        cesta={[
          { text: "Domů", kam: "/" },
          { text: "Ročník", kam: `/serie/${serie}` },
          // Název regaty je odkaz na její úvod — kromě úvodu samotného,
          // kde by vedl sám na sebe. Poslední drobeček odkaz nikdy není.
          aktivni === "uvod"
            ? { text: detail.nazev }
            : { text: detail.nazev, kam: adresaSekce(serie, zavod, "uvod") },
          ...(aktivni === "uvod" ? [] : [{ text: NAZVY[aktivni] }]),
        ]}
      />
      {/* Štítek do správy stojí hned u drobečků, protože je to cesta, ne
          sdělení o regatě — a po sjednocení designu je to jediný odkaz,
          který veřejná stránka pořadateli dluží. */}
      {maRoli && <DoSpravy serie={serie} zavod={zavod} prace={prace} />}

      <Hlavicka zavod={detail} akce={akce} />

      <Upozorneni upozorneni={upozorneni} />

      {/* <b>Tytéž dlaždice jako ve správě</b> (Filip, 29. 10. 2026:
          „veřejný může taky jít do stejného designu"). Vystřídaly pruh tabů
          s akordeonem na úzkém displeji — mřížka se zalomí sama, takže
          akordeon, který vznikl kvůli nálezu R10, přestal být potřeba.

          Vlajky zůstávají: tady jsou obsahem stránky, ne navigací nad ní,
          a nesou význam ze Závodních signálů. */}
      <DlazdiceSekci
        popisek="Části regaty"
        aktivni={aktivni}
        polozky={moje.map((sekce) => ({
          klic: sekce,
          nazev: NAZVY[sekce],
          kam: adresaSekce(serie, zavod, sekce),
          znacka: VLAJKY[sekce] ? <VlajkaIkona vlajka={VLAJKY[sekce]} /> : <ZnackaPuvodni />,
        }))}
      />
    </>
  );
}
