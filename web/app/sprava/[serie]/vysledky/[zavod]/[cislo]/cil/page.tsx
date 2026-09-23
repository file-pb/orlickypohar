import Link from "next/link";
import { notFound } from "next/navigation";
import { Drobecky } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { KODY, nactiZapis, nazevStavu, type ZapisRozjizdky } from "@/lib/vysledky";
import { Cil } from "./cil";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Cílová obrazovka — správa" };

type Parametry = { params: Promise<{ serie: string; zavod: string; cislo: string }> };

/**
 * Cílová obrazovka (PLAN.md, oddíl *Zápis z vody*): zápis rozjížďky na
 * vodě, klepáním na loď ve chvíli, kdy projede cílem.
 *
 * <b>Jediné místo správy s javascriptem.</b> Klepání v reálném čase bez
 * něj nejde. Stránka sama je serverová — načte zápis a rozhodne, jestli
 * se smí psát; javascript dostane až hotový stav.
 */
export default async function CilovaObrazovka({ params }: Parametry) {
  const { serie, zavod, cislo } = await params;

  const cisloRozjizdky = Number(cislo);
  if (!Number.isInteger(cisloRozjizdky) || cisloRozjizdky < 1) notFound();

  const { stav, data: zapis } = await nactiZapis(serie, zavod, cisloRozjizdky);

  if (stav === "vypadek") return <Vypadek />;
  if (stav === "neni") notFound();

  const zapisAdresa = `/sprava/${serie}/vysledky/${zavod}/${cisloRozjizdky}`;
  const regataAdresa = `/sprava/${serie}/vysledky/${zavod}`;

  const drobecky = (
    <Drobecky
      cesta={[
        { text: "Domů", kam: "/" },
        { text: "Výsledky", kam: `/sprava/${serie}/vysledky` },
        { text: zapis?.zavodNazev ?? "Regata", kam: regataAdresa },
        { text: `${cisloRozjizdky}. rozjížďka`, kam: zapisAdresa },
        { text: "Cíl" },
      ]}
    />
  );

  if (stav === "neprihlasen" || stav === "odmitnut")
    return (
      <>
        {drobecky}
        <h1>Cíl — {cisloRozjizdky}. rozjížďka</h1>
        <p className="prazdno">
          {stav === "odmitnut" ? "Přihlášení vypršelo. " : "Na zápis výsledků se musíš "}
          <Link href="/prihlaseni">{stav === "odmitnut" ? "Přihlas se znovu" : "přihlásit"}</Link>.
        </p>
      </>
    );

  if (stav === "nesmi" || !zapis)
    return (
      <>
        {drobecky}
        <h1>Cíl — {cisloRozjizdky}. rozjížďka</h1>
        <p className="prazdno">
          K výsledkům téhle regaty nemáš přístup. Zapisuje je její pořadatel.
        </p>
      </>
    );

  return (
    <>
      {drobecky}
      <h1>Cíl — {zapis.cislo}. rozjížďka</h1>
      <p className="podtitulek">
        {zapis.zavodNazev}
        <span className={`stitek vysledek-${zapis.stavVysledku.toLowerCase()}`}>
          {nazevStavu(zapis.stavVysledku)}
        </span>
        {!zapis.doSerie && <span className="stitek">mimo pohár</span>}
      </p>

      {zapis.procNelze ? (
        <>
          <p className="hlaska" role="status">
            {zapis.procNelze}
          </p>
          <p className="poznamka">
            <Link href={zapisAdresa}>Zobrazit zápis</Link>
          </p>
        </>
      ) : zapis.lode.length === 0 ? (
        <p className="prazdno">
          Do ročníku zatím není přihlášená žádná loď, takže není komu dojezd
          zapsat.
        </p>
      ) : (
        <Cil
          key={otisk(zapis)}
          serie={serie}
          zavod={zavod}
          zapis={zapis}
          popisyKodu={KODY}
          otisk={otisk(zapis)}
        />
      )}

      <p className="poznamka">
        Zápis se ukládá po každém klepnutí a zůstává v návrhu. Ověří ho a
        schválí rozhodčí na <Link href={regataAdresa}>stránce regaty</Link>.
        Opravit ho jde i doma ve <Link href={zapisAdresa}>formuláři z papíru</Link>.
        Fotka papírového zápisu se přikládá{" "}
        <Link href={`${zapisAdresa}#papir`}>tamtéž</Link>.
      </p>
    </>
  );
}

/**
 * Otisk uloženého zápisu. Jiný otisk znamená, že obrazovka drží zastaralá
 * data a má začít znovu (viz `Cil`).
 */
function otisk(zapis: ZapisRozjizdky) {
  return [
    zapis.startV ?? "",
    ...zapis.lode.map((l) => `${l.prihlaskaId}:${l.poradiVCili ?? ""}:${l.kod ?? ""}:${l.dojezdV ?? ""}`),
  ].join("|");
}
