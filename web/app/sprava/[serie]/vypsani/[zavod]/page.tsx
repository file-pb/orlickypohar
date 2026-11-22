import Link from "@/app/sprava/odkaz";
import { notFound } from "next/navigation";
import { Drobecky, drobeckySpravy, drobekRegaty } from "@/app/drobecky";
import { NadpisUkonu, PruhUkonuRegaty } from "@/app/sprava/pruh-ukonu";
import { mistniZOkamziku } from "@/lib/cas-praha";
import { zastavka } from "@/lib/kalendar";
import { vypsaniAkce } from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Vypsání závodu — správa" };

type Parametry = {
  params: Promise<{ serie: string; zavod: string }>;
  searchParams: Promise<{ chyba?: string; stav?: string }>;
};

/**
 * <b>Vypsání závodu</b> — jediné místo, kde se vyplňuje dokument podle
 * Dodatku J1 (nálezy R1, R8 a R21 oponentury rozhodčího).
 *
 * <b>Proč to vzniklo až 22. 11. 2026.</b> Dokument se generuje z dat od
 * 28. 10., jenže ta data neměl kudy nikdo vyplnit: API je v příjmu mělo,
 * formulář kalendáře je neposílal a vypsání o nich mlčelo. Čtyři body
 * z jedenácti tím zůstávaly prázdné a místo konání bylo v kódu napevno
 * „neuvedené". Chyběla obrazovka, ne pravidla.
 *
 * <b>V Milošově seznamu sekcí je vypsání první</b> (střípek 6, 27. 10.
 * 2026: *„vypsani zavodu - plachetni smernice - zavodni trat - prihlasky -
 * startovni listina"*) a byla to jediná z nich, kterou aplikace neměla.
 *
 * <b>Prázdné pole maže.</b> Jinde ve správě znamená prázdno „neměnit";
 * tady se posílají všechny kolonky najednou, protože bez mazání by se
 * překlep nedal vzít zpět. Totéž pravidlo drží API.
 *
 * <b>Nenapovídá se tím, že se předvyplní.</b> Nápověda z ročníku stojí
 * v `placeholder` a pod polem jako věta — předvyplněná hodnota by se
 * uložila i tomu, kdo si jí nevšiml, a dokument by pak tvrdil něco, co
 * nikdo nenapsal.
 *
 * Celé serverové a bez javascriptu jako zbytek administrace.
 */
export default async function VypsaniZastavky({ params, searchParams }: Parametry) {
  const { serie, zavod } = await params;
  const zpravy = await searchParams;

  const z = await zastavka(serie, zavod);
  if (!z) notFound();

  const napoveda = (co: string | null | undefined) => (co ? `Minule: ${co}` : undefined);

  return (
    <>
      <Drobecky
        cesta={drobeckySpravy(serie, [
          drobekRegaty(serie, zavod, z.nazev),
          { text: "Vypsání závodu" },
        ])}
      />
      <PruhUkonuRegaty serie={serie} zavod={zavod} aktivni="vypsani" />
      <NadpisUkonu serie={serie} zavod={zavod} ukon="vypsani" regata={z.nazev} />

      {zpravy.chyba && (
        <p className="chyba" role="alert">
          {zpravy.chyba}
        </p>
      )}
      {zpravy.stav === "ulozeno" && (
        <p className="hlaska" role="status">
          Uloženo. <Link href={`/serie/${serie}/zavody/${zavod}/vypsani`}>Jak dokument vypadá</Link>
        </p>
      )}

      <p className="poznamka">
        Z těchhle údajů se skládá <b>vypsání závodu</b> — dokument, kterým
        závod prohlašuje, podle čeho se jede. Co zůstane prázdné, dokument
        přizná jako nevyplněné; nic si nedomýšlí. Termín, název a počty do
        poháru se mění v <Link href={`/sprava/${serie}/kalendar`}>kalendáři</Link>.
      </p>

      <form action={vypsaniAkce} className="formular dvojice">
        <input type="hidden" name="serie" value={serie} />
        <input type="hidden" name="zavod" value={zavod} />

        <label className="siroke">
          Místo konání
          <input
            type="text"
            name="mistoKonani"
            maxLength={200}
            defaultValue={z.mistoKonani ?? ""}
            placeholder={napoveda(z.napovedaMista) ?? "Marina Orlík – Vltava – Orlická přehrada"}
          />
          <span className="poznamka">
            Kde se jede, ne sídlo pořadatele. Stojí v záhlaví dokumentu.
          </span>
        </label>

        <label className="siroke">
          Dráha
          <textarea
            name="draha"
            rows={3}
            maxLength={1000}
            defaultValue={z.draha ?? ""}
            placeholder={
              napoveda(z.napovedaDrahy) ??
              "Start a cíl u koupacího mola, točnou bóji levobokem a zpět do cíle."
            }
          />
          <span className="poznamka">
            Jak se obvykle jezdí — J1.3(4). Přesné bóje se staví až na vodě,
            tenhle text je popis, ne předpis trati.
          </span>
        </label>

        <label>
          Po kolikáté se poslední den nestartuje
          <input
            type="time"
            name="posledniStartV"
            defaultValue={z.posledniStartV?.slice(0, 5) ?? ""}
          />
          <span className="poznamka">
            {z.napovedaPoslednihoStartu
              ? `Jinde v ročníku nejčastěji ${z.napovedaPoslednihoStartu.slice(0, 5)}.`
              : "Ve vzoru vypsání 16:00."}
          </span>
        </label>

        <label>
          Uzávěrka přihlášek
          <input type="date" name="uzaverkaPrihlasek" defaultValue={z.uzaverkaPrihlasek ?? ""} />
        </label>

        <label className="siroke">
          Startovné
          <input
            type="text"
            name="startovne"
            maxLength={200}
            defaultValue={z.startovne ?? ""}
            placeholder="450 Kč za loď, platí se při registraci"
          />
        </label>

        <label>
          Čas prvního vyzývacího znamení
          <input
            type="datetime-local"
            name="prvniVyzyvaciZnameni"
            defaultValue={mistniZOkamziku(z.prvniVyzyvaciZnameni)}
          />
          <span className="poznamka">Čas Orlíku, ne čas tvého počítače.</span>
        </label>

        <label>
          Délka startovní procedury (minuty)
          <input
            type="number"
            name="delkaProceduryMin"
            min={1}
            max={60}
            defaultValue={z.delkaProceduryMin}
          />
          <span className="poznamka">
            ZPJ 26 počítá s pěti minutami; hvězdička u něj pouští jinou
            délku, a právě proto patří do vypsání.
          </span>
        </label>

        <button type="submit">Uložit vypsání</button>
      </form>
    </>
  );
}
