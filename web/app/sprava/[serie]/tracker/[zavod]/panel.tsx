import Link from "@/app/sprava/odkaz";
import { nactiTrat, type Boje } from "@/lib/boje";
import { nactiPrvky, type Prvek } from "@/lib/trat";
import { nactiPolohy, type SnimekPoloh } from "@/lib/polohy";
import { nactiRozjizdky } from "@/lib/vysledky";
import { cestaProMereni, mrizkaVody, spojniceTrati, type Poloha, type UzelTrati } from "@/lib/voda";
import { Z_NEJMENE, Z_NEJVIC } from "@/lib/mapa";
import type { Znacka } from "@/app/nacrt/mapa/plavba";
import { ZiveLode } from "./zive";

/**
 * Živá mapa jako panel, který se dá postavit na víc obrazovek.
 *
 * <b>Proč panel a ne jen vlastní stránka</b> (Filip, 24. 10. 2026:
 * *„řekl bych, že se hodí tracking dolů na stránku výsledků"*). Kdo zapisuje
 * cíl, je právě ten, koho zajímá, kdo je ještě na vodě — je to tatáž osoba
 * ve stejnou chvíli, takže ptát se o obrazovku vedle je zbytečná cesta.
 * Vlastní stránka zůstává: na telefonu u cíle je mapa přes celý displej
 * něco jiného než mapa pod seznamem rozjížděk.
 *
 * <b>Načítání i geometrie jsou tady, ne na stránce</b>, aby druhé místo
 * nebylo druhá pravda. Měřicí trasa se počítá na serveru: mřížka vody má
 * desítky tisíc buněk a obrys nádrže nemá co dělat v prohlížeči.
 */

/** O kolik se měřicí trasa drží dál od břehu. Odhad, ne měření. */
const ODSTUP_M = 60;

export type DataTrackeru = {
  /** `"neni"`, když taková regata neexistuje — volající má dát 404. */
  stav: Awaited<ReturnType<typeof nactiTrat>>["stav"];
  znacky: Znacka[];
  trasa: Poloha[];
  spojnice: Record<number, Poloha[][]>;
  prvni: SnimekPoloh | null;
  /**
   * Rozjížďky regaty — kvůli výběru záznamu. <b>Ze správy, ne z veřejného
   * detailu</b>: revize protestu se dělá i nad regatou, která ještě není
   * zveřejněná.
   */
  rozjizdky: { cislo: number; stav: string; startV: string | null }[];
};

export async function dataTrackeru(serie: string, zavod: string): Promise<DataTrackeru> {
  const [{ stav, trat }, prvky, prvni, prehled] = await Promise.all([
    nactiTrat(serie, zavod),
    nactiPrvky(serie, zavod),
    nactiPolohy(serie, zavod),
    // Výpadek seznamu rozjížděk mapu neshodí, jen nebude co přehrát.
    nactiRozjizdky(serie, zavod).catch(() => ({ stav: "vypadek" as const })),
  ]);
  const rozjizdky =
    prehled.stav === "ok" && prehled.data
      ? prehled.data.rozjizdky.map((r) => ({
          cislo: r.cislo,
          stav: r.stav,
          startV: r.startV,
        }))
      : [];

  const znacky = prvky.map((p) => naZnacku(p, trat ?? []));

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

  return { stav, znacky, trasa, spojnice, prvni, rozjizdky };
}

export function PanelTrackeru({
  serie,
  zavod,
  data,
  jenOdkazKdyzNic = false,
}: {
  serie: string;
  zavod: string;
  data: DataTrackeru;
  /**
   * Když se nikdo nehlásí, ukázat jen řádek s odkazem místo mapy.
   *
   * <b>Pro stránku, kde se pracuje i mimo závod.</b> Prázdná mapa pod
   * seznamem rozjížděk je velká díra, která nic neříká, a klientská část by
   * se každých pět vteřin ptala na nic. Vlastní stránka trackeru se naopak
   * otevírá kvůli mapě, takže tam se kreslí vždycky.
   */
  jenOdkazKdyzNic?: boolean;
}) {
  const kam = `/sprava/${serie}/tracker/${zavod}`;

  if (data.znacky.length < 2)
    return (
      <p className="tracker-prazdno">
        Trať zatím nemá dva prvky, takže se nedá počítat postup ani kreslit
        mapa. Postav ji na <Link href={`/sprava/${serie}/boje/${zavod}`}>obrazovce bójí</Link>.
      </p>
    );

  // <b>Chybějící snímek není prázdná voda</b> (oponentura, 24. 10. 2026).
  // `prvni === null` znamená „nepodařilo se zeptat" — výpadek API nebo
  // odmítnutí —, a tvrdit z toho, že se nikdo nehlásí, je výrok o vodě
  // vyrobený z odpovědi serveru. Na téhle obrazovce na tom visí rozhodnutí
  // o tom, jestli je někdo ještě venku.
  if (jenOdkazKdyzNic) {
    if (data.prvni === null)
      return (
        <p className="poznamka">
          <Link href={kam}>Živé polohy lodí na mapě</Link> — teď se je nedaří
          načíst.
        </p>
      );

    if (data.prvni.lode.length === 0)
      return (
        <p className="poznamka">
          <Link href={kam}>Živé polohy lodí na mapě</Link> — zatím se nehlásí
          žádná loď. Jakmile se začnou hlásit, mapa se ukáže rovnou tady.
        </p>
      );
  }

  return (
    <ZiveLode
      serie={serie}
      zavod={zavod}
      znacky={data.znacky}
      trasa={data.trasa}
      spojnice={data.spojnice}
      prvni={data.prvni}
      rozjizdky={data.rozjizdky}
    />
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
