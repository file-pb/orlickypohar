import { notFound } from "next/navigation";
import { type VerejnaTrat } from "@/lib/api";
import { NAZVY_SMERU, nazevStrany, nazevTypu, type TypPrvku } from "@/lib/trat";
import { MapkaTrati, type PrvekNaMape } from "@/app/mapka-trati";
import { IkonaPrvku } from "@/app/ikona-prvku";
import { ZnakVRadku } from "@/app/znak-boje";
import { StitekBoku } from "@/app/stitek-boku";
import { NahledPrvku } from "@/app/nahled-prvku";
import { stopaProPrvek, typStavbyProPrvek } from "@/lib/stavba-prvku";
import { Boky } from "@/app/boky";
import { Vypadek } from "@/app/vypadek";
import { HlavaZastavky } from "../hlava";
import { nactiZastavku } from "../data";

export const dynamic = "force-dynamic";

type Parametry = { params: Promise<{ slug: string; zavod: string }> };

export const metadata = { title: "Trať" };

/**
 * Trať regaty pro závodníky a diváky.
 *
 * <b>Vlastní adresa, ne odstavec na stránce regaty</b> (plán, oddíl *Úvodník
 * a taby*): tohle je to, co si závodník otevře před startem a pošle dál.
 * Zvlášť taky proto, že se čte bez cache — stránka regaty se smí odležet
 * minutu, trať ne.
 *
 * <b>Odemčená trať říká „počkej", ne nic</b> (plán, oddíl *Trať je veřejná,
 * jakmile ji rozhodčí přijme*). Prázdná stránka vypadá jako porucha a stará
 * mapka lže: kdo podle ní vyrazí, pluje k bóji, která už stojí jinde.
 */
export default async function VerejnaTratStranka({ params }: Parametry) {
  const { slug, zavod: slugZavodu } = await params;

  const zastavka = await nactiZastavku(slug, slugZavodu);
  if (!zastavka) return <Vypadek co="Trať" />;

  const { detail: zavod, trat } = zastavka;
  // Komunitní akce trať nemá a sekce pro ni neexistuje.
  if (zavod.druh === "Akce") notFound();

  return (
    <Boky serie={slug}>
      <HlavaZastavky
        serie={slug}
        zavod={slugZavodu}
        detail={zavod}
        trat={trat}
        aktivni="trat"
      />
      <h2>
        Trať
        {/* Ke které rozjížďce trať patří (plán, *Trať je veřejná*, past 2).
            U vícerozjížďkové regaty má každá jinou — bez tohohle si lidi
            stáhnou GPX od té včerejší. U regaty s jednou tratí to číslo
            není a věta by jen překážela. */}
        {trat?.cisloRozjizdky != null && (
          <span className="stitek"> {trat.cisloRozjizdky}. rozjížďka</span>
        )}
      </h2>

      {trat === null ? (
        <p className="prazdno">
          Trať zatím není vyvěšená. Objeví se tady ve chvíli, kdy ji rozhodčí
          přijme — do té doby se staví a čísla by stejně neplatila.
        </p>
      ) : trat.prestavba ? (
        // Tahle hláska je důvod, proč stránka vzniká. Dokud ji API vydávalo
        // a web ne, přestavba se venku nijak neprojevila.
        <p className="hlaska">
          <b>Trať se přestavuje, počkej.</b> Starou schválně neukazujeme: kdo
          by podle ní vyrazil, pluje k bóji, která už jinde stojí. Jakmile ji
          rozhodčí znovu přijme, bude tu nová.
        </p>
      ) : (
        <>
          <MapkaTrati prvky={trat.prvky.map(naMapu)} />
          <PoradiPrvku prvky={trat.prvky} boje={trat.boje} />
          <MimoTrat trat={trat} />
          {trat.prijatoV && (
            <p className="poznamka">
              Vyvěšeno {kdy(trat.prijatoV)}, kdy trať přijal rozhodčí. Dokud je
              přijatá, nikdo s ní nehýbe; při přestavbě tu bude stát, že se
              přestavuje.{" "}
              {/* Odkaz na směrnici jen tehdy, když nějaká visí: slovo
                  „směrnice" u regaty, která ji nevyvěsila, pošle člověka
                  hledat dokument, co není. */}
              {zavod.smernice && zavod.smernice.length > 0 ? (
                <>
                  Co platí, je{" "}
                  <a
                    href={zavod.smernice[0].adresa}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    plachetní směrnice
                  </a>{" "}
                  — tahle stránka je obrázek k ní, ne pravidlo.
                </>
              ) : (
                <>Je to obrázek trati, ne pravidlo — co platí, řekne pořadatel.</>
              )}
            </p>
          )}
        </>
      )}
    </Boky>
  );
}

/** Soupis prvků v pořadí. Mapka ukazuje kde, tenhle seznam čím a jak. */
function PoradiPrvku({
  prvky,
  boje,
}: {
  prvky: VerejnaTrat["prvky"];
  /** Kvůli barvě a tvaru značek — konec prvku je nenese. */
  boje: VerejnaTrat["boje"];
}) {
  if (prvky.length === 0)
    return (
      <p className="prazdno">
        Trať je vyvěšená, ale nemá jediný prvek — zeptej se pořadatele. Na vodě
        nejspíš něco stojí, jen to sem nestihl zapsat.
      </p>
    );

  return (
    <>
      <h2>Čím se pluje</h2>
      <ol className="seznam-prvku">
        {prvky.map((p, i) => (
          <li key={i}>
            {/* Shrnutí je tentýž řádek jako ve správě — jedna věta: tvar,
                číslo, co to je a kterou značkou. Výšku i odsazení nese
                tenhle obal, ne `li`: kolečko pořadí je `position: absolute`
                vysoké 2 rem, takže bez něj přetéká do dalšího řádku a řádky
                se překrývají (Filip, 15. 10. 2026). */}
            <div className="shrnuti-prvku">
              <IkonaPrvku typ={p.typ} strana={p.strana} />
              {/* Tytéž značky jako ve správě: tvar říká, co je to za prvek,
                  značka jak to vypadá na vodě. Závodník u vody hledá bóji
                  podle vzhledu, ne podle jména. */}
              <ZnackyPrvku prvek={p} boje={boje} />
              <span className="poradi-prvku">{p.poradi}.</span>
              <b>{nazevTypu(p.typ)}</b>
              <span className="znacky">
                {p.a.nazev}
                {p.b && ` – ${p.b.nazev}`}
              </span>
              <StitekBoku typ={p.typ} strana={p.strana} />
              {p.smer && <span className="stitek">{NAZVY_SMERU[p.smer]}</span>}
            </div>

            {/* <b>Detail je pro závodníka, ne pro pořadatele</b> (Filip,
                15. 10. 2026: *„cílem bude co nejlépe a nejjednodušeji
                informovat závodníky, co je to zač a jak to vypadá"*).
                Nejsou tu tedy žádné úpravy — jen obrázek, krátký popis
                a věta o průjezdu.

                `name` dělá z `details` akordeon sám: otevřením jednoho se
                ostatní zavřou, bez javascriptu, stejně jako ve správě. */}
            <details className="prvek" name="prvek-trati">
              <summary>Detail</summary>
              <DetailPrvku prvek={p} />
            </details>
          </li>
        ))}
      </ol>
    </>
  );
}

/**
 * Bóje, které na vodě stojí, ale žádný prvek je nepoužívá.
 *
 * <b>Mlčet o nich je horší než je vypsat.</b> Závodník je uvidí — plavou
 * tam — a bez téhle věty bude hádat, jestli je má obeplout. Typicky je to
 * zbytek po přestavbě nebo bóje k něčemu jinému; může to ale být i to, že
 * pořadatel zapomněl udělat prvek, a pak je lepší, když se někdo ozve.
 *
 * <para>
 * Páruje se podle jména, protože ven se id bójí nevydávají. Jmenná kolize
 * by prvkovou bóji skryla z tohohle seznamu — to je ta neškodnější chyba
 * než naopak.
 * </para>
 */
function MimoTrat({ trat }: { trat: VerejnaTrat }) {
  const vPrvcich = new Set(trat.prvky.flatMap((p) => [p.a.nazev, ...(p.b ? [p.b.nazev] : [])]));
  const zbyle = trat.boje.filter((b) => !vPrvcich.has(b.nazev));
  if (zbyle.length === 0) return null;

  return (
    <p className="poznamka">
      Na vodě stojí i {zbyle.map((b) => b.nazev).join(", ")} — {zbyle.length === 1 ? "ta" : "ty"}{" "}
      ale {zbyle.length === 1 ? "není" : "nejsou"} součástí trati a na mapce
      {zbyle.length === 1 ? " ji" : " je"} proto nekreslíme.
    </p>
  );
}

/** Veřejný prvek pro mapku. Jestli je druhý konec bóje, se ven nevydává. */
function naMapu(p: VerejnaTrat["prvky"][number], i: number): PrvekNaMape {
  const konec = (k: NonNullable<VerejnaTrat["prvky"][number]["b"]>) => ({
    nazev: k.nazev,
    sirka: k.sirka,
    delka: k.delka,
    barva: k.barva,
    tvar: k.tvar,
    znaceni: k.znaceni,
  });

  const konce = [konec(p.a)];
  if (p.b) konce.push(konec(p.b));

  return { klic: i, typ: p.typ, poradi: p.poradi, konce, smer: p.smer, strana: p.strana };
}

function kdy(kdy: string) {
  return new Date(kdy).toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Co je to za prvek, jednou větou pro závodníka.
 *
 * <b>Popis, ne definice.</b> Jméno typu („otočná bóje") říká, co to je,
 * ale ne co s tím — a kdo nejezdí pravidelně, pozná rozdíl mezi otočnou
 * a průjezdní až tady.
 */
const POPIS_TYPU: Record<TypPrvku, string> = {
  OtocnaBoje: "Značka, u které se mění směr — loď ji objede a pokračuje jinam.",
  PrujezdniBoje: "Značka, která se jen míjí. Směr se u ní nemění, jen se nesmí obeplout z druhé strany.",
  Brana: "Dvě značky a mezi nimi se projíždí.",
  OtocnaBrana: "Dvě značky: projede se mezi nimi a loď se otočí zpátky.",
  Odskok: "Otočná značka a hned za ní druhá, kterou se po otočce odjíždí.",
  OtocnaZona: "Místo, kterého stačí se dotknout — nemusí se objíždět.",
  Start: "Linie mezi dvěma značkami, odkud se vyráží.",
  Cil: "Linie mezi dvěma značkami, kterou se doplouvá.",
};

/**
 * Jak se tím projíždí, slovy. <b>Bok se říká lodí, ne značkou</b> (Filip,
 * 12. 10. 2026): levobok znamená, že loď má značku po levé ruce — tedy že
 * sama jede vpravo od ní. Proto tu stojí „po levé ruce" a ne „vlevo".
 */
function jakSeJede(prvek: VerejnaTrat["prvky"][number]): string {
  const ruka = prvek.strana === "PoLeve" ? "po levé ruce" : "po pravé ruce";
  const smer = prvek.smer ? NAZVY_SMERU[prvek.smer] : null;

  switch (prvek.typ) {
    case "OtocnaBoje":
      return `Otáčí se kolem ní a loď ji míjí ${ruka}.`;
    case "PrujezdniBoje":
      return `Projíždí se kolem a loď ji nechává ${ruka}.`;
    case "Odskok":
      return `Otočí se kolem první značky ${ruka} a odjíždí se kolem druhé.`;
    case "Brana":
      return "Projíždí se mezi oběma značkami.";
    case "OtocnaBrana":
      return "Projede se mezi značkami a loď se otočí. Kolem které z nich, si volí posádka.";
    case "OtocnaZona":
      return "Stačí se dotknout; objíždět se nemusí.";
    case "Start":
      return smer ? `Startuje se ${smer}.` : "Startuje se přes linii mezi značkami.";
    case "Cil":
      return smer ? `Proplouvá se ${smer}.` : "Proplouvá se linií mezi značkami.";
  }
}

/**
 * Co je ten prvek zač a jak se jede. <b>Obrázek napřed</b>: kreslený náhled
 * řekne „kudy loď projede" rychleji než věta, a u startu a cíle se to slovy
 * plete nejvíc — jednou šipka vede z linie ven, podruhé do ní.
 *
 * <b>Je to tentýž náhled, jaký viděl stavitel</b> (`NahledPrvku`), ne druhý
 * podobný: kdyby se rozešly, ukazoval by web závodníkovi jiný průjezd, než
 * jaký pořadatel zadal.
 *
 * <b>Fotky tu zatím nejsou</b>, protože je veřejné API nevydává —
 * `VerejnaBojeDto` ani `VerejnyKonecDto` je nenesou. Až je ponese, patří
 * sem pod náhled.
 */
function DetailPrvku({ prvek }: { prvek: VerejnaTrat["prvky"][number] }) {
  const typ = typStavbyProPrvek(prvek.typ);
  const konce = [prvek.a, ...(prvek.b ? [prvek.b] : [])];

  return (
    <div className="detail-prvku-verejny">
      <NahledPrvku
        typ={typ}
        stopa={stopaProPrvek(prvek.typ, prvek.strana)}
        znacky={konce.map((k) => ({
          barva: k.barva ?? undefined,
          tvar: k.tvar ?? undefined,
          znaceni: k.znaceni ?? undefined,
          jmeno: k.nazev,
        }))}
        smer={prvek.smer ?? null}
        popisek={`${nazevTypu(prvek.typ)} ${konce.map((k) => k.nazev).join(" – ")}`}
      />

      <p>{POPIS_TYPU[prvek.typ]}</p>

      <p className="jak-se-jede">{jakSeJede(prvek)}</p>

      {/* Co k tomu řekl pořadatel. Na řádku se dřív usekávala,
          tady je celá. */}
      {prvek.poznamka && <p className="poznamka">{prvek.poznamka}</p>}
    </div>
  );
}

/**
 * Značky prvku v řádku. <b>Páruje se podle jména</b>, protože ven se id
 * bójí nevydávají — tentýž kompromis jako v „bóje mimo trať" níž. Jmenná
 * kolize by značku nenakreslila, a to je neškodnější chyba než nakreslit
 * cizí.
 */
function ZnackyPrvku({
  prvek,
  boje,
}: {
  prvek: VerejnaTrat["prvky"][number];
  boje: VerejnaTrat["boje"];
}) {
  const konce = [prvek.a, ...(prvek.b ? [prvek.b] : [])]
    .map((k) => boje.find((b) => b.nazev === k.nazev))
    .filter((b): b is VerejnaTrat["boje"][number] => b !== undefined);
  if (konce.length === 0) return null;

  return (
    <span className="znaky-prvku">
      {konce.map((b) => (
        <ZnakVRadku
          key={b.nazev}
          barva={b.barva ?? undefined}
          tvar={b.tvar ?? undefined}
          znaceni={b.znaceni ?? undefined}
        />
      ))}
    </span>
  );
}
