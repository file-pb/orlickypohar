import type { ReactNode } from "react";
import Link from "@/app/sprava/odkaz";
import { nactiJa } from "@/lib/ja";
import { nactiSerie } from "@/lib/api";
import { polozkaOponentury, polozkyRocniku, polozkyWebu, prava } from "@/lib/co-smim";
import { DlazdiceSekci } from "@/app/prepinac-sekci";

/**
 * Klíč tabu ročníku z jeho adresy: `/sprava/{ročník}/{úsek}`.
 *
 * <b>Prázdný úsek je „Co teď"</b> — ten tab bydlí na adrese ročníku samotné,
 * protože je to landing, na který se po přihlášení přichází. Klíč potřebuje
 * jméno, aby si podle něj CSS našlo barvu (`data-polozka` v `globals.css`).
 */
export const tabZAdresy = (kam: string) => kam.split("/")[3] || "coted";

/**
 * <b>Pruh tabů ročníku</b> — totéž ovládání jako u regaty, o patro výš
 * (konzilium, 12. 11. 2026).
 *
 * <b>Jeden pruh naráz.</b> Nad obrazovkou stojí pruh jejího patra a nic víc;
 * nadřazená patra nese drobeček. Jinak by nad výsledky regaty byly tři pruhy
 * pod sebou a půlka okna by byla navigace.
 *
 * <b>Seznam skládá `polozkyRocniku` z udělených práv</b>, takže pruh je
 * zároveň odpověď na otázku „co vlastně můžu spravovat" — a nemůže slibovat
 * obrazovku, kterou server odmítne.
 *
 * <b>Zbude-li po filtraci jediná dlaždice, pruh se nekreslí.</b> Čistý editor
 * má v ročníku jen *Novinky*; pruh o jedné položce nic neříká a vypadá jako
 * porucha. Totéž pravidlo má `/sprava` při jediném ročníku.
 */
export async function PruhRocniku({
  serie,
  aktivni,
}: {
  serie: string;
  /** Klíč otevřeného tabu: `coted`, `regaty`, `kalendar`, `vysledky`, … */
  aktivni?: string;
}) {
  // `nactiJa` je cache na požadavek, takže tohle nestojí další volání API.
  const { ja } = await nactiJa();
  if (!ja) return null;

  const taby = polozkyRocniku(prava(ja), serie);
  if (taby.length < 2) return null;

  return (
    <DlazdiceSekci
      popisek="Co spravuju v ročníku"
      aktivni={aktivni}
      polozky={taby.map((t) => ({
        klic: tabZAdresy(t.kam),
        nazev: t.nazev,
        nazevKratky: t.uzky,
        kam: t.kam,
        popis: t.popis,
      }))}
    />
  );
}

/**
 * Nadpis okna ročníku: <b>váhu má agenda, ne jméno ročníku</b>.
 *
 * Návrh to měl obráceně a konzilium to vrátilo: nejtěžší typografie seděla
 * na tom jediném, co je na všech obrazovkách ročníku totéž — a co navíc
 * stojí o řádek výš v drobečku. Při přepnutí tabu se pak nejnápadnější věc
 * na stránce nezměnila, takže oko změnu nevidělo a muselo si ji přečíst.
 *
 * <b>Apozice `{ročník} — {agenda}` platí ve všech patrech</b>, protože jen
 * ona nikdy nenutí jméno skloňovat: *Výsledky Jarního větru* je past „Jarní
 * vítr uložena", a u *Izolepy* a *24hodinovky* dopadne pokaždé jinak.
 *
 * <b>Jméno agendy si bere z týchž položek jako dlaždice</b>, ne z řetězce na
 * stránce — kdyby si ho každá obrazovka psala sama, rozešlo by se s pruhem
 * nad ní.
 */
export async function NadpisRocniku({
  serie,
  nazevRocniku,
  tab,
  podtitulek,
  children,
}: {
  serie: string;
  /**
   * Jméno ročníku. Kde ho stránka stejně zná (kalendář, oprávnění), předá
   * se; jinak se dotáhne samo — veřejné čtení sérií má `revalidate: 60`,
   * takže to nestojí volání navíc na každém přepnutí tabu.
   */
  nazevRocniku?: string;
  /** Klíč otevřeného tabu — týž jako `aktivni` u pruhu. */
  tab: string;
  /** Co stojí na konci lana: role, počty, stav. Součást řádku, ne odstavec pod ním. */
  podtitulek?: ReactNode;
  children?: ReactNode;
}) {
  const { ja } = await nactiJa();
  const nazev = ja
    ? polozkyRocniku(prava(ja), serie).find((t) => tabZAdresy(t.kam) === tab)?.nazev
    : undefined;

  const rocnik =
    nazevRocniku ??
    (await nactiSerie().catch(() => []))?.find((s) => s.slug === serie)?.nazev ??
    serie;

  return (
    <div className="radek-nadpisu vybrany-ukon" data-ukon={tab}>
      <h1>
        {/* Všechno v jednom prvku: `h1` je ve správě mřížka s lanem, takže
            každý samostatný kus textu by se stal vlastním sloupcem a mezery
            kolem pomlčky by se roztáhly na `gap`. */}
        <span className="nadpis-ukonu">
          {/* Pevná mezera před pomlčkou: po zrušení `nowrap` se zalomí
              za ni, nikdy před ni — pomlčka na začátku řádku je osiřelá. */}
          <span className="ctvrt">{rocnik}&nbsp;—</span>{" "}
          {nazev && <strong className="agenda">{nazev}</strong>}
        </span>
        {children}
      </h1>
      {podtitulek && <p className="podtitulek">{podtitulek}</p>}
    </div>
  );
}

/**
 * <b>Pata okna: co leží mimo ročník.</b>
 *
 * Skládá se z `polozkyWebu`, tedy z práv — rozhodčí bez role na web si tu
 * nemá číst jména obrazovek, kam se nedostane (pravidlo „obrazovka nabízí
 * jen to, co projde"). Při prázdném seznamu se nekreslí vůbec.
 *
 * <b>Otázky k aplikaci stojí tady</b>, ne v pruhu: je to fronta, ne agenda
 * ročníku. Když něco visí, připomene se navíc úkolem v „Co teď".
 */
export async function PataOkna({ serie }: { serie: string }) {
  const { ja } = await nactiJa();
  if (!ja) return null;

  const udelena = prava(ja);
  const web = polozkyWebu(udelena);
  const otazky = polozkaOponentury(udelena, serie);
  if (web.length === 0 && !otazky) return null;

  return (
    <p className="pata-okna">
      {otazky && <Link href={otazky.kam}>{otazky.nazev}</Link>}
      {web.map((p) => (
        <Link key={p.kam} href={p.kam}>
          {p.nazev}
        </Link>
      ))}
    </p>
  );
}
