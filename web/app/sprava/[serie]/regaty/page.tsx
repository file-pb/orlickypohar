import Link from "@/app/sprava/odkaz";
import { Drobecky, drobeckySpravy } from "@/app/drobecky";
import { Stav } from "@/app/stav";
import { Vypadek } from "@/app/vypadek";
import { datum } from "@/app/datum";
import { NadpisRocniku, PataOkna, PruhRocniku } from "@/app/sprava/pruh-rocniku";
import { nactiJa } from "@/lib/ja";
import { nactiSerie } from "@/lib/api";
import { nactiZastavky, type ZastavkaVysledky } from "@/lib/vysledky";
import { jenSveZastavky, prava, smi, type Udelena } from "@/lib/co-smim";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Regaty ročníku" };

/**
 * <b>Tab „Regaty" — stálý seznam regat ročníku</b> (konzilium, 12. 11. 2026).
 *
 * Proč vlastní tab vedle *Co teď*: jsou to dvě otázky, ne jedna. *Co teď*
 * odpovídá na „co čeká mně" a mění se podle dne; tohle odpovídá na „v jakém
 * stavu je která regata" a je stálé. Jedno jméno nad obojím by byla tatáž
 * vada, kterou Filip našel u tabu *Výsledky*: jméno slibuje míň, než za ním
 * je. Do 12. 11. 2026 stálo obojí pod sebou na jedné stránce a člověk musel
 * poznat, která část odpovídá na kterou otázku.
 *
 * <b>Řádek nese jednu odpověď: čeká něco, a na kom to je.</b> Adresát se
 * počítá z týchž práv jako úkoly v *Co teď* — bez něj si obě obrazovky
 * protiřečily v tom jediném, co čtenář hledá (rozhodčí viděl na řádku
 * červený štítek k práci, kterou smí jen pořadatel).
 */
export default async function RegatyRocniku({
  params,
}: {
  params: Promise<{ serie: string }>;
}) {
  const { serie } = await params;

  const { ja } = await nactiJa();
  const udelena = prava(ja);

  if (!ja)
    return (
      <>
        <Drobecky cesta={drobeckySpravy(serie)} />
        <h1>Regaty ročníku</h1>
        <p className="prazdno">
          Na správu se musíš <Link href="/prihlaseni">přihlásit</Link>.
        </p>
      </>
    );

  const { stav, data } = await nactiZastavky(serie);
  if (stav === "vypadek") return <Vypadek />;

  const zastavky = data ?? [];
  const jenSve = jenSveZastavky(udelena, serie);
  const moje = jenSve ? zastavky.filter((z) => jenSve.includes(z.zavod)) : zastavky;

  const nazevRocniku =
    (await nactiSerie().catch(() => []))?.find((s) => s.slug === serie)?.nazev ?? serie;

  const dnes = new Date().toISOString().slice(0, 10);
  const dnesniCh = moje.filter((z) => z.datum === dnes && z.stav !== "Zruseny").length;

  return (
    <>
      <Drobecky cesta={drobeckySpravy(serie)} />
      <PruhRocniku serie={serie} aktivni="regaty" />
      <NadpisRocniku
        serie={serie}
        nazevRocniku={nazevRocniku}
        tab="regaty"
        podtitulek={
          <>
            {moje.length} {tvarRegat(moje.length)}
            {dnesniCh > 0 && " · dnes se jede"}
          </>
        }
      />

      {moje.length === 0 ? (
        <p className="prazdno">
          {jenSve
            ? "Nemáš roli u žádné regaty tohohle ročníku."
            : "V ročníku zatím žádná regata není. Zakládají se v Kalendáři."}
        </p>
      ) : (
        <>
          <p className="poznamka">
            Klepnutím se otevře regata — přihlášky, směrnice, trať, rozjížďky
            a polohy pohromadě.
          </p>
          <ul className="seznam seznam-regat">
            {moje.map((z) => (
              /* Kotva zůstává kvůli starším odkazům: mířily sem v době, kdy
                 cíl „regata ve správě" nebyl stránkou, ale řádkem seznamu. */
              <li key={z.zavod} id={z.zavod}>
                <Link
                  className="radek-regaty"
                  href={`/sprava/${encodeURIComponent(serie)}/zavod/${encodeURIComponent(z.zavod)}`}
                >
                  <span className={`nazev${z.stav === "Zruseny" ? " skrtnute" : ""}`}>
                    {z.nazev}
                  </span>
                  <Stav stav={z.stav} />
                  <span className="prubeh">{prubeh(z, udelena, serie)}</span>
                  <span className="termin">{datum(z.datum)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <PataOkna serie={serie} />
    </>
  );
}

const tvarRegat = (n: number) => (n === 1 ? "regata" : n < 5 ? "regaty" : "regat");

/**
 * Jedna věta o tom, jak daleko regata je — a <b>vždycky s adresátem</b>,
 * když se čeká.
 *
 * <b>Jmenovatel tu nikdy nestojí.</b> „2 ze 4 rozjížděk" by tvrdilo plán,
 * který neexistuje: počet rozjížděk se rozhoduje na vodě podle větru
 * a `pocetRozjizdek` je počet už existujících, ne zamýšlených. Na tom čísle
 * přitom visí škrt v závodě, takže by si ho pořadatel i rozhodčí přečetli
 * každý jinak.
 */
function prubeh(z: ZastavkaVysledky, udelena: Udelena[], serie: string): React.ReactNode {
  const jsemPoradatel = smi(udelena, { role: "Organizator", serie, zavod: z.zavod });
  const jsemRozhodci = smi(udelena, { role: "Rozhodci", serie });

  if (z.kRevizi.length > 0)
    return (
      <span className="ceka">
        {z.kRevizi.length} {tvarRozjizdek(z.kRevizi.length)} k revizi ·{" "}
        {jsemPoradatel ? "čeká na tebe" : "čeká na pořadatele"}
      </span>
    );

  if (z.kPodpisu.length > 0)
    return (
      <span className="ceka">
        {z.kPodpisu.length} {tvarRozjizdek(z.kPodpisu.length)}{" "}
        {jsemRozhodci ? "čeká na tvůj podpis" : "čeká na podpis rozhodčího"}
      </span>
    );

  if (z.kPublikaci.length > 0)
    return (
      <span className="ceka">
        {z.kPublikaci.length} podepsaných a ještě ne venku ·{" "}
        {jsemRozhodci ? "pustíš ven ty" : "pustí ven rozhodčí"}
      </span>
    );

  if (z.publikovanych > 0)
    return (
      <span className="klid">
        {z.publikovanych} {tvarRozjizdek(z.publikovanych)} venku
      </span>
    );

  if (z.stav === "Planovany") return <span className="klid">čeká na vypsání závodu</span>;
  return <span className="klid">zatím bez zapsaných výsledků</span>;
}

const tvarRozjizdek = (n: number) =>
  n === 1 ? "rozjížďka" : n < 5 ? "rozjížďky" : "rozjížděk";
