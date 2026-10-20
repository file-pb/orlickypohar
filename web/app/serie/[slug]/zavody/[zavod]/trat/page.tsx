import { notFound } from "next/navigation";
import { nactiVerejnouTrat, type VerejnaTrat } from "@/lib/api";
import { NAZVY_SMERU, nazevStrany, nazevTypu, type TypPrvku } from "@/lib/trat";
import { MapkaTrati, naMapu } from "@/app/mapka-trati";
import { IkonaPrvku } from "@/app/ikona-prvku";
import { NAZVY_ZNACENI, ZnakVRadku, znakPodleVyhlasky } from "@/app/znak-boje";
import { StitekBoku } from "@/app/stitek-boku";
import { NahledPrvku } from "@/app/nahled-prvku";
import { stopaProPrvek, typStavbyProPrvek } from "@/lib/stavba-prvku";
import { Boky } from "@/app/boky";
import { Vypadek } from "@/app/vypadek";
import { HlavaZastavky } from "../hlava";
import { nactiZastavku } from "../data";

export const dynamic = "force-dynamic";

type Parametry = {
  params: Promise<{ slug: string; zavod: string }>;
  searchParams: Promise<{ rozjizdka?: string }>;
};

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
export default async function VerejnaTratStranka({ params, searchParams }: Parametry) {
  const { slug, zavod: slugZavodu } = await params;
  // Výběr je v adrese, ne v javascriptu: dá se poslat odkazem na konkrétní
  // trať a po načtení zůstane. Nula a nesmysl se zahodí — API by na ně
  // stejně vrátilo 404 a stránka by hlásila „trať není vyvěšená", což by
  // u regaty, která tratě má, lhalo.
  const vybrana = Number((await searchParams).rozjizdka ?? 0) || undefined;

  const zastavka = await nactiZastavku(slug, slugZavodu, vybrana);
  if (!zastavka) return <Vypadek co="Trať" />;

  const { detail: zavod, trat } = zastavka;

  /**
   * Záložky, když vybraná rozjížďka trať nemá.
   *
   * <b>Bez tohohle byla stránka slepá ulička.</b> `?rozjizdka=9` — překlep,
   * starý odkaz, zrušená rozjížďka — vrátí `null`, stránka napsala „trať
   * zatím není vyvěšená" a <b>zahodila i záložky</b>, takže se divák neměl
   * čím vrátit k tratím, které vyvěšené jsou. Hláška navíc lhala: regata
   * tratě má, jen ne tuhle.
   *
   * Druhé volání jde jen touhle cestou, ne při každém načtení.
   */
  const nahradni = vybrana && trat === null
    ? await nactiVerejnouTrat(slug, slugZavodu)
    : null;
  const rozjizdky = (trat ?? nahradni)?.rozjizdky ?? null;
  // Jedna trať není z čeho vybírat; záložka by jen ubrala místo mapce.
  const maZalozky = (rozjizdky?.length ?? 0) > 1;
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
            není a věta by jen překážela.

            Se záložkami se štítek neukazuje: zvýrazněná záložka říká
            totéž a dvakrát pod sebou „2. rozjížďka" vypadá jako chyba. */}
        {trat?.cisloRozjizdky != null && !maZalozky && (
          <span className="stitek"> {trat.cisloRozjizdky}. rozjížďka</span>
        )}
      </h2>

      {/* <b>Záložka za každou veřejnou trať</b> (Filip, 20. 10. 2026:
          *„tady se zobrazuje pouze jedna trať, i když je veřejná trať i ke
          druhé rozjížďce. Tam bych dal tab, aby se dalo přepínat mezi
          veřejnými tratěmi."*).

          Stránka vydávala jen trať rozjížďky na řadě a o ostatních divák
          neměl jak zjistit, že vůbec jsou — přitom u vícerozjížďkové
          regaty je plují tytéž lodě a porovnat si je chtějí předem.

          Odkazy, ne javascript: výběr je v adrese, takže se dá poslat.
          U jedné trati se záložky nekreslí — jeden tab není z čeho vybírat
          a jen by ubíral místo mapce. */}
      {maZalozky && rozjizdky && (
        <nav className="zalozky-trati verejne" aria-label="Tratě rozjížděk">
          {rozjizdky.map((cislo) => {
            // Bez výběru je zvýrazněná ta, kterou API vydalo samo — jinak
            // by na „té na řadě" nesvítila žádná a vypadalo by to, že se
            // kouká na něco mimo seznam.
            const jeTato = (vybrana ?? trat?.cisloRozjizdky) === cislo;
            return (
              <a
                key={cislo}
                href={`/serie/${slug}/zavody/${slugZavodu}/trat?rozjizdka=${cislo}`}
                className={jeTato ? "vybrany" : undefined}
                aria-current={jeTato ? "page" : undefined}
              >
                {cislo}. rozjížďka
              </a>
            );
          })}
        </nav>
      )}

      {trat === null ? (
        <p className="prazdno">
          {/* Dvě různé věci, dvě různé věty. „Regata trať nemá" u regaty,
              která jich má dvě, je nepravda — a divák podle ní odejde,
              místo aby klikl na záložku vedle. */}
          {rozjizdky && rozjizdky.length > 0 ? (
            <>
              Trať téhle rozjížďky vyvěšená není. Vyber si nahoře tu, která
              se jede — ostatní rozhodčí přijal.
            </>
          ) : (
            <>
              Trať zatím není vyvěšená. Objeví se tady ve chvíli, kdy ji
              rozhodčí přijme — do té doby se staví a čísla by stejně
              neplatila.
            </>
          )}
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
          <PoradiPrvku
            prvky={trat.prvky}
            boje={trat.boje}
            zkracenoU={trat.zkracenoUPrvkuId ?? null}
          />
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
  zkracenoU,
}: {
  prvky: VerejnaTrat["prvky"];
  /** Kvůli barvě a tvaru značek — konec prvku je nenese. */
  boje: VerejnaTrat["boje"];
  /**
   * Prvek, u kterého rozhodčí zkrátil — od něj je tam cíl.
   *
   * <b>Zbytek se zešedne, nemaže</b>: podle těch prvků se plulo, než
   * padlo rozhodnutí, a trať, ze které se tiše ztrácejí značky, je
   * horší než trať, která řekne, kde končí.
   */
  zkracenoU: number | null;
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

      {/* Zkrácení je rozhodnutí za jízdy a veřejná trať je to, co má
          závodník v telefonu. Bez téhle věty by plul k cíli, který
          rozhodčí vyškrtl (testovací session, 16. 10. 2026). */}
      {zkracenoU !== null && (
        <p className="hlaska zkraceno">
          <b>Trať je zkrácená.</b> Cíl je u prvku, který je níž označený —
          prvky za ním se už nejedou.
        </p>
      )}
      <ol className="seznam-prvku">
        {prvky.map((p, i) => {
          const kde = zkracenoU === null ? -1 : prvky.findIndex((x) => x.id === zkracenoU);
          const tadyCil = zkracenoU !== null && p.id === zkracenoU;
          const uz = kde >= 0 && i > kde;
          return (
          <li key={i} className={uz ? "mimo-zkraceni" : undefined}>
            {/* Shrnutí je tentýž řádek jako ve správě — jedna věta: tvar,
                číslo, co to je a kterou značkou. Výšku i odsazení nese
                tenhle obal, ne `li`: kolečko pořadí je `position: absolute`
                vysoké 2 rem, takže bez něj přetéká do dalšího řádku a řádky
                se překrývají (Filip, 15. 10. 2026). */}
            {/* <b>Modal bez javascriptu</b> (Filip, 16. 10. 2026: *„nepoužívej
                detail, ale dej ikonky do řádky a pak modal nebo offcanvas"*).
                Přepínač je tohle zaškrtávátko: ikonky v řádku jsou jeho
                `label`, pozadí okna taky — takže kliknutí mimo i druhé
                kliknutí na ikonku zavírá, a stránka si vystačí s CSS.
                Zůstává zaostřitelné, aby šlo okno otevřít i klávesnicí. */}
            {/* <b>Vlastní předpona, ne „prvek-"</b>: mapka nad seznamem
                kreslí značky s `id="prvek-0"` kvůli `:target`, takže
                `label for="prvek-2"` by mířil na kolečko v SVG a okno by
                se neotevřelo. Dvě stejná `id` v dokumentu si prohlížeč
                nestěžuje — jen tiše vybere to první (16. 10. 2026). */}
            <input type="checkbox" id={`okno-prvku-${p.id}`} className="prepinac-prvku" />

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
              {tadyCil && <span className="stitek zkraceno">tady je cíl</span>}
              {uz && <span className="stitek">nejede se</span>}
              {/* Náhled fotky vpravo v řádku (Filip, 15. 10. 2026:
                  *„náhledy bójí a fotky v trati na regatě"*). Jeden
                  obrázek na konec, ne galerie — řádek má zůstat řádkem.
                  Celé fotky jsou v detailu. */}
              <IkonyDetailu prvek={p} pro={`okno-prvku-${p.id}`} />
            </div>

            {/* <b>Detail je pro závodníka, ne pro pořadatele</b> (Filip,
                15. 10. 2026: *„cílem bude co nejlépe a nejjednodušeji
                informovat závodníky, co je to zač a jak to vypadá"*).
                Nejsou tu tedy žádné úpravy — jen obrázek, krátký popis
                a věta o průjezdu. */}
            <OknoPrvku prvek={p} pro={`okno-prvku-${p.id}`} />
          </li>
          );
        })}
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

  // Co ta značka znamená podle vyhlášky. <b>Je to jiný údaj než bok</b>
  // (Filip, 16. 10. 2026, a plyne to i z 12. 10.): „pravá strana plavební
  // dráhy" říká, co bóje na vodě je, kdežto „pravobokem" říká, jak ji
  // tahle rozjížďka objíždí. Červený válec může být na trati levobok
  // a přitom pořád značit pravou stranu dráhy — kdo to čte jako jedno
  // a totéž, objede ho špatně.
  //
  // <b>Zadané značení má přednost před dopočtem z barvy a tvaru.</b>
  // Červená plovatka je na Orlíku pravá strana dráhy, ale do dvojice
  // „červená + válcová" nespadá — dopočet by u ní mlčel, přestože to
  // pořadatel u bóje vybral.
  const vyhlaska = [
    ...new Set(
      konce
        .map(
          (k) =>
            (k.znaceni ? NAZVY_ZNACENI[k.znaceni] : "") ||
            znakPodleVyhlasky(k.barva ?? undefined, k.tvar ?? undefined),
        )
        .filter((v): v is string => !!v),
    ),
  ];

  return (
    <div className="detail-prvku-verejny">
      <h3>
        {nazevTypu(prvek.typ)} <span className="znacky">{konce.map((k) => k.nazev).join(" – ")}</span>
      </h3>

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

      {/* Dva popsané údaje, ne věta (Filip, 16. 10. 2026). Závodník na
          vodě hledá očima „čím" a „jak", ne souvětí. Řádek chybí, když
          se nemá co napsat: bóje bez barvy vyhlášku neurčí a start ani
          cíl se bokem neobjíždí. */}
      {(vyhlaska.length > 0 || prvek.strana) && (
        <dl className="udaje-prvku">
          {vyhlaska.length > 0 && (
            <>
              <dt>Značka</dt>
              <dd>{vyhlaska.join(", ")}</dd>
            </>
          )}
          {prvek.strana && (
            <>
              <dt>Obeplutí</dt>
              <dd>{nazevStrany(prvek.strana)}</dd>
            </>
          )}
        </dl>
      )}

      <p>{POPIS_TYPU[prvek.typ]}</p>

      <p className="jak-se-jede">{jakSeJede(prvek)}</p>

      {/* Co k tomu řekl pořadatel. Na řádku se dřív usekávala,
          tady je celá. */}
      {prvek.poznamka && <p className="poznamka">{prvek.poznamka}</p>}

      {/* <b>Fotky až tady, ne v náhledu nad mapkou.</b> Ze souřadnic se
          nepozná, jestli je bóje nafouklá a co je za ní na břehu — to je
          přesně to, co závodník u vody hledá. Nákres nad nimi říká, jak
          se prvek pluje; fotka, jak vypadá. */}
      {konce.map((k) =>
        (k.fotky ?? []).length === 0 ? null : (
          <div className="fotky-znacky" key={k.nazev}>
            {/* Jméno konce jen u prvku, který má dva — u jedné značky by
                to byl nadpis nad jedinou věcí. */}
            {konce.length > 1 && <h4>{k.nazev}</h4>}
            <div className="rada-fotek">
              {k.fotky!.map((f) => (
                <figure key={f.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.nahled}
                    alt={f.popis ?? `Značka ${k.nazev}`}
                    width={f.sirka}
                    height={f.vyska}
                    loading="lazy"
                  />
                  <figcaption>
                    {f.popis && `${f.popis} · `}Foto {f.autor}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        ),
      )}
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

/**
 * Ikonky na konci řádku: nákres průjezdu a fotka značky. <b>Obojí otevírá
 * totéž okno</b> (Filip, 16. 10. 2026) — nejsou to dvě různá tlačítka, ale
 * dva náhledy toho, co je uvnitř: jak se tudy pluje a jak to vypadá.
 *
 * <b>Jedna fotka, ne galerie.</b> Když má prvek dva konce a oba fotku,
 * vezme se první: na řádku jde o to, že fotka je, ne kolik jich je. Celé
 * jsou v okně.
 */
function IkonyDetailu({
  prvek,
  pro,
}: {
  prvek: VerejnaTrat["prvky"][number];
  /** Id zaškrtávátka, které okno otevírá. */
  pro: string;
}) {
  const fotka = [prvek.a, ...(prvek.b ? [prvek.b] : [])].flatMap((k) => k.fotky ?? []).at(0);

  return (
    <span className="vpravo">
      <label className="ikona-detailu nakres" htmlFor={pro}>
        <NahledPrvku
          typ={typStavbyProPrvek(prvek.typ)}
          stopa={stopaProPrvek(prvek.typ, prvek.strana)}
          znacky={[prvek.a, ...(prvek.b ? [prvek.b] : [])].map((k) => ({
            barva: k.barva ?? undefined,
            tvar: k.tvar ?? undefined,
            znaceni: k.znaceni ?? undefined,
            jmeno: k.nazev,
          }))}
          smer={prvek.smer ?? null}
          popisek={`Jak se pluje ${nazevTypu(prvek.typ).toLowerCase()}`}
        />
      </label>
      {fotka && (
        <label className="ikona-detailu foto" htmlFor={pro}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fotka.nahled} alt="" width={fotka.sirka} height={fotka.vyska} loading="lazy" />
        </label>
      )}
    </span>
  );
}

/**
 * Okno s detailem prvku. <b>Pozadí je taky `label`</b>, takže kliknutí
 * mimo zavírá — a protože pozadí překryje celý řádek, zavírá i druhé
 * kliknutí na ikonku. Žádný javascript: na trati u vody je stránka
 * nejspíš poslední věc, která se stihla načíst.
 */
function OknoPrvku({
  prvek,
  pro,
}: {
  prvek: VerejnaTrat["prvky"][number];
  pro: string;
}) {
  return (
    <div className="modal-prvku">
      <label className="pozadi-modalu" htmlFor={pro} aria-label="Zavřít detail" />
      <div className="okno-modalu" role="dialog" aria-label={nazevTypu(prvek.typ)}>
        <label className="zavrit-modal" htmlFor={pro} aria-label="Zavřít detail">
          ×
        </label>
        <DetailPrvku prvek={prvek} />
      </div>
    </div>
  );
}
