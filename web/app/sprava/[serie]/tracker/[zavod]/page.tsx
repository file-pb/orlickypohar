import { notFound } from "next/navigation";
import { Drobecky, drobeckySpravy, drobekRegaty } from "@/app/drobecky";
import { nazevZastavky } from "@/lib/kalendar";
import { nactiTrat, type Boje } from "@/lib/boje";
import { nactiPrvky, type Prvek } from "@/lib/trat";
import { nactiPolohy } from "@/lib/polohy";
import { cestaProMereni, mrizkaVody, spojniceTrati, type Poloha, type UzelTrati } from "@/lib/voda";
import { Z_NEJMENE, Z_NEJVIC } from "@/lib/mapa";
import type { Znacka } from "@/app/nacrt/mapa/plavba";
import { ZiveLode } from "./zive";

// Odpověď závisí na tom, kdo se ptá, a mění se po vteřinách.
export const dynamic = "force-dynamic";

export const metadata = { title: "Tracker regaty — správa" };

/** O kolik se měřicí trasa drží dál od břehu. Odhad, ne měření. */
const ODSTUP_M = 60;

type Parametry = { params: Promise<{ serie: string; zavod: string }> };

/**
 * Živá mapa regaty pro pořadatele a rozhodčího.
 *
 * <b>Tam, kde se podle polohy jedná, mapa je nutná</b> (Filip, 24. 10.
 * 2026). Text *„1,2 km jihozápadně"* odpoví na *„startujeme?"*, ale
 * neodpoví na *„je ještě na vodě, nebo už u břehu?"* — a to je otázka za
 * šera a ve zhoršeném počasí, tedy ten bezpečnostní rozměr, kvůli kterému
 * celá kapitola existuje i bez jediné zveřejněné rozjížďky.
 *
 * <b>Veřejnost se sem nedostane.</b> Živý přenos ven je vlastní přepínač,
 * který zamyká rozprava; dokud se na něj mapa nenapojí, platí bezpečná
 * výchozí hodnota.
 */
export default async function TrackerRegaty({ params }: Parametry) {
  const { serie, zavod } = await params;

  const [{ stav, trat }, nazev, prvky, prvniSnimek] = await Promise.all([
    nactiTrat(serie, zavod),
    nazevZastavky(serie, zavod),
    nactiPrvky(serie, zavod),
    nactiPolohy(serie, zavod),
  ]);
  if (stav === "neni") notFound();

  const znacky = prvky.map((p) => naZnacku(p, trat ?? []));

  // Měřicí trasa se počítá na serveru: mřížka vody má desítky tisíc buněk
  // a obrys nádrže nemá co dělat v prohlížeči. Bez ní je postup všude nula
  // a nevznikne pořadí.
  const uzly: Poloha[] = znacky.map((m) => ({ sirka: m.sirka, delka: m.delka }));
  const trasa: Poloha[] = [];
  const spojnice: Record<number, Poloha[][]> = {};

  if (uzly.length >= 2) {
    const mrizka = mrizkaVody(uzly);
    for (let i = 0; i < uzly.length - 1; i++) {
      const noha = cestaProMereni(mrizka, uzly[i], uzly[i + 1], ODSTUP_M);
      if (noha) trasa.push(...(i === 0 ? noha : noha.slice(1)));
    }

    const stredSirka = uzly.reduce((s, u) => s + u.sirka, 0) / uzly.length;
    const naPixelPriZ0 = 156_543.03 * Math.cos((stredSirka * Math.PI) / 180);
    const uzlyTrati: UzelTrati[] = znacky.map((m) => ({
      poloha: { sirka: m.sirka, delka: m.delka },
      bok: m.strana ?? null,
      otaci: m.typ === "OtocnaBoje",
    }));
    for (let z = Z_NEJMENE + 2; z <= Z_NEJVIC; z++) {
      spojnice[z] = spojniceTrati(uzlyTrati, naPixelPriZ0 / 2 ** z);
    }
  }

  return (
    <main className="sprava">
      <Drobecky cesta={[...drobeckySpravy(serie), drobekRegaty(serie, zavod, nazev)]} />
      <h1>Tracker — {nazev}</h1>

      {znacky.length < 2 ? (
        <p className="tracker-prazdno">
          Trať zatím nemá dva prvky, takže se nedá počítat postup ani kreslit
          mapa. Postav ji na obrazovce bójí.
        </p>
      ) : (
        <ZiveLode
          serie={serie}
          zavod={zavod}
          znacky={znacky}
          trasa={trasa}
          spojnice={spojnice}
          prvni={prvniSnimek}
        />
      )}
    </main>
  );
}

/**
 * Prvek trati na značku, jak ji kreslí mapa.
 *
 * Uzel je bóje sama, nebo střed mezi konci u čáry — to je ten bod, kterým
 * podle mapy vede dráha.
 */
function naZnacku(p: Prvek, boje: Boje[]): Znacka {
  const znak = (id: number) => {
    const b = boje.find((x) => x.id === id);
    return {
      barva: b?.barva ?? "Zluta",
      tvar: b?.tvar ?? "Kulova",
      // Bez druhu značení kreslí mapa plavidlo jako červenou bóji; „naše
      // bóje" je ta výchozí, protože takových je na trati většina.
      znaceni: b?.znaceni ?? "NaseBoje",
    };
  };

  const konce = [{ sirka: p.a.sirka, delka: p.a.delka, ...znak(p.a.id) }];
  if (p.b) konce.push({ sirka: p.b.sirka, delka: p.b.delka, ...znak(p.b.id) });

  const sirka = konce.reduce((s, k) => s + k.sirka, 0) / konce.length;
  const delka = konce.reduce((s, k) => s + k.delka, 0) / konce.length;

  return {
    poradi: p.poradi,
    nazev: p.a.nazev,
    typ: p.typ,
    strana: p.strana ?? undefined,
    konce,
    sirka,
    delka,
  };
}
