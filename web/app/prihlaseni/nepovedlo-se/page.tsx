import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Přihlášení se nepovedlo" };

/**
 * Proč přihlášení skončilo dřív, než mělo.
 *
 * Existuje proto, že tenhle konec byl dřív <b>úplně němý</b>: web přesměroval
 * na úvodní stránku s `?prihlaseni=chyba`, což nikde nic nevypsalo. Výsledek
 * vypadal stejně jako „nejsi přihlášený", takže se rozdíl mezi vypršelým
 * pokusem, zablokovanou cookie a odmítnutím poskytovatele nedal poznat
 * odnikud.
 */
const DUVODY: Record<string, { nadpis: string; co: string }> = {
  "bez-toku": {
    nadpis: "Prohlížeč neposlal cookie s rozdělaným přihlášením.",
    co:
      "Buď od kliknutí na „Přihlásit\" uplynulo víc než deset minut, nebo "
      + "prohlížeč cookie zablokoval. V přísném režimu ochrany soukromí a "
      + "u blokovaných cookies třetích stran se to stává; zkus to znovu "
      + "a bez anonymního okna.",
  },
  stav: {
    nadpis: "Odpověď nepatřila k tomuhle pokusu o přihlášení.",
    co:
      "Web si u sebe drží náhodný klíč a porovnává ho s tím, co přijde zpátky. "
      + "Nesedělo to — obvykle proto, že se přihlášení otevřelo dvakrát a "
      + "dokončilo se to starší okno.",
  },
  vymena: {
    nadpis: "Poskytovatel odmítl vyměnit kód za token.",
    co: "Podrobnost je v logu webu. Nejčastěji jde o prošlý kód nebo o návratovou adresu, kterou aplikace u poskytovatele nemá povolenou.",
  },
  poskytovatel: {
    nadpis: "Přihlášení skončilo u poskytovatele.",
    co: "Buď jsi ho zrušil, nebo účet nemá k téhle aplikaci přístup.",
  },
  "bez-kodu": {
    nadpis: "Odpověď od poskytovatele nepřišla celá.",
    co: "Chyběl v ní kód nebo klíč pokusu. Zkus přihlášení znovu.",
  },
};

export default async function Nepovedlo({
  searchParams,
}: {
  searchParams: Promise<{ proc?: string; kod?: string }>;
}) {
  const { proc, kod } = await searchParams;
  const duvod = (proc && DUVODY[proc]) || {
    nadpis: "Přihlášení se nedokončilo.",
    co: "Zkus to prosím znovu.",
  };

  return (
    <>
      <h1>Přihlášení se nepovedlo</h1>
      <p className="hlaska chyba" role="alert">
        {duvod.nadpis}
      </p>
      <p>{duvod.co}</p>
      {kod && (
        <p className="poznamka">
          Poskytovatel poslal kód <code>{kod}</code>.
        </p>
      )}
      <p className="hero-odkazy">
        <Link className="tlacitko" href="/prihlaseni">
          Zkusit znovu
        </Link>
        <Link className="tlacitko druhotne" href="/">
          Zpátky na web
        </Link>
      </p>
    </>
  );
}
