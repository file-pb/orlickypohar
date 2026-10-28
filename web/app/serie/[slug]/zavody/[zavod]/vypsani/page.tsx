import Link from "next/link";
import { notFound } from "next/navigation";
import { Vypadek } from "@/app/vypadek";
import { Boky } from "@/app/boky";
import { ApiNedostupne, nactiVypsani, type VypsaniZavodu } from "@/lib/api";
import { HlavaZastavky } from "../hlava";
import { nactiZastavku } from "../data";

export const dynamic = "force-dynamic";

type Parametry = { params: Promise<{ slug: string; zavod: string }> };

export const metadata = { title: "Vypsání závodu" };

/**
 * Vypsání závodu — dokument podle Dodatku J1 Závodních pravidel jachtingu
 * (nálezy R1 a R8 oponentury rozhodčího, 28. 10. 2026).
 *
 * <b>Proč je tahle stránka veřejná a bez přihlášení.</b> ZPJ 25.1: *„Vypsání
 * závodu musí být dostupné každé lodi, která se přihlašuje do závodu dříve,
 * než se přihlásí."* Podle vypsání se člověk rozhoduje, jestli pojede —
 * takže je první položkou stránky regaty pro obě publika, jak to vyjmenoval
 * rozhodčí Miloš Zvonař 27. 10. 2026.
 *
 * <b>A u tohohle poháru drží víc než formu.</b> Pohár pořadatelsky ofiko
 * není, takže ZPJ pro něj neplatí z titulu členství ve svazu — platí jen
 * proto, že si je závod vezme, a prohlašuje se to právě tady, bodem
 * J1.1(2). Dvacet bodů za diskvalifikaci, škrty a koeficienty jsou vlastní
 * pravidla poháru a jediné místo, kde smějí být napsaná, je vypsání
 * a plachetní směrnice.
 *
 * <b>Dokument se generuje</b> z týchž čísel, podle kterých se počítá
 * (`Features/Zavody/Vypsani.cs`), takže se s výpočtem nemůže rozejít. Co
 * aplikace neví, nedosazuje — a seznam chybějícího stojí nahoře, protože
 * je to zároveň seznam práce pro toho, kdo dokument vydává.
 */
export default async function VypsaniStranka({ params }: Parametry) {
  const { slug, zavod: slugZavodu } = await params;

  const zastavka = await nactiZastavku(slug, slugZavodu);
  if (!zastavka) return <Vypadek co="Vypsání závodu" />;

  const { detail, trat } = zastavka;
  // Komunitní akce se nejede podle závodních pravidel, takže není co vypsat.
  if (detail.druh === "Akce") notFound();

  let vypsani: VypsaniZavodu | null;
  try {
    vypsani = await nactiVypsani(slug, slugZavodu);
  } catch (e) {
    if (e instanceof ApiNedostupne) return <Vypadek co="Vypsání závodu" />;
    throw e;
  }
  if (!vypsani) notFound();

  return (
    <Boky serie={slug}>
      <HlavaZastavky
        serie={slug}
        zavod={slugZavodu}
        detail={detail}
        trat={trat}
        aktivni="vypsani"
      />

      <h2>Vypsání závodu</h2>
      <p className="podtitulek tesne">
        {vypsani.nazev} · {vypsani.serieNazev}
      </p>

      {/* <b>Co chybí, stojí nahoře, ne v patičce.</b> Je to jediná věc, kvůli
          které by se čtenář mohl splést — dokument vypadá hotově, i když
          v něm chybí uzávěrka nebo startovné. A pro pořadatele je to seznam
          práce, kterou má udělat, než otevře přihlášky. */}
      {vypsani.chybi.length > 0 && (
        <div className="hlaska" role="status">
          <p>
            <b>Vypsání zatím není úplné.</b> Dodatek J1 Závodních pravidel žádá
            i tohle, a aplikace to zatím nemá kde vzít:
          </p>
          <ul>
            {vypsani.chybi.map((co) => (
              <li key={co}>{co}</li>
            ))}
          </ul>
        </div>
      )}

      {/* <b>Bez vlastních tříd, jen z toho, co web má.</b> `globals.css`
          měly 28. 10. 2026 rozdělané jiné session a nový blok uprostřed
          cizí práce je past na konflikt — a dokument stejně nepotřebuje
          nic než nadpisy, odstavce a `.prazdno` na nevyplněný bod. */}
      {vypsani.body.map((b) => (
        <section key={b.bod}>
          <h3>
            {b.nadpis} ({b.bod})
          </h3>
          {/* Text přichází po odstavcích oddělených novým řádkem — je to
              dokument, ne jedna věta, a zlomy v něm nesou členění. */}
          {b.text ? (
            b.text.split("\n").map((radek, i) => <p key={i}>{radek}</p>)
          ) : (
            <p className="prazdno">Není vyplněné.</p>
          )}
        </section>
      ))}

      <p className="poznamka">
        Tohle vypsání sestavila aplikace z údajů o regatě. Vydává ho pořadatel
        a uznává rozhodčí; co v něm chybí, se musí doplnit, než se otevřou
        přihlášky. Další pravidla závodu jsou v{" "}
        <Link href={`/serie/${slug}/zavody/${slugZavodu}/smernice`}>
          plachetních směrnicích
        </Link>
        .
      </p>
    </Boky>
  );
}
