import Link from "next/link";
import { notFound } from "next/navigation";
import { Vypadek } from "@/app/vypadek";
import type { ZavodDetail } from "@/lib/api";
import { Boky } from "@/app/boky";
import { HlavaZastavky } from "../hlava";
import { nactiZastavku } from "../data";
import { PrihlaseneLode } from "../sekce-lode";

export const dynamic = "force-dynamic";

type Parametry = {
  params: Promise<{ slug: string; zavod: string }>;
  searchParams: Promise<{ trida?: string }>;
};

export const metadata = { title: "Startovní listina" };

/**
 * Kdo jede. Vlastní sekce, ne přívažek pod prázdnou tabulkou výsledků —
 * u regaty, která se teprve pojede, je to jediné, co je o ní známo.
 *
 * <b>Jmenuje se Startovní listina</b> (Filip, 27. 10. 2026, podle
 * rozhodčího — nález R10). Adresa zůstala `/lode`: odkazy na ni už jsou
 * rozeseté po webu i v návodu a slug nic netvrdí.
 */
export default async function Lode({ params, searchParams }: Parametry) {
  const { slug, zavod: slugZavodu } = await params;
  const { trida } = await searchParams;

  const zastavka = await nactiZastavku(slug, slugZavodu);
  if (!zastavka) return <Vypadek co="Startovní listina" />;

  const { detail, trat } = zastavka;
  // Komunitní akce se nejede a nikdo se na ni nehlásí.
  if (detail.druh === "Akce") notFound();

  // Přihlásit se dá i k regatě s výsledky: loď se často domluví telefonem
  // na startu a zapíše se dodatečně (Filip, 17. 9. 2026).
  const prihlasuje = detail.stav === "Vypsany" || detail.stav === "Odjety";
  const naPrihlasku = `/serie/${slug}/zavody/${slugZavodu}/prihlaska`;

  return (
    <Boky serie={slug}>
      <HlavaZastavky
        serie={slug}
        zavod={slugZavodu}
        detail={detail}
        trat={trat}
        aktivni="lode"
      />
      {detail.lode.length === 0 ? (
        <>
          <h2>Startovní listina</h2>
          <p className="prazdno">{prazdnySeznam(detail.stav, prihlasuje)}</p>
          {prihlasuje && (
            <p className="poznamka">
              <Link href={naPrihlasku}>Přihlásit loď →</Link>
            </p>
          )}
        </>
      ) : (
        <PrihlaseneLode
          lode={detail.lode}
          trida={trida}
          adresa={(k) =>
            `/serie/${slug}/zavody/${slugZavodu}/lode?trida=${encodeURIComponent(k)}`
          }
          prihlaska={prihlasuje ? naPrihlasku : undefined}
        />
      )}
    </Boky>
  );
}

/**
 * Co stojí nad prázdným seznamem lodí.
 *
 * <para>
 * <b>„Nikdo se nepřihlásil" u regaty, která ještě není vypsaná, je lež
 * o budoucnosti</b> (průchod scénáři Izolepy, 15. 10. 2026): zní jako
 * konečný stav, přitom se přihlášky teprve otevřou. Čtenář přitom nemá
 * z čeho poznat rozdíl — odkaz na přihlášku se u nevypsané regaty
 * neukazuje, takže vidí jen tu větu.
 * </para>
 */
function prazdnySeznam(stav: ZavodDetail["stav"], prihlasuje: boolean) {
  if (prihlasuje) return "Zatím se nikdo nepřihlásil — můžeš být první.";

  if (stav === "Zruseny") return "Regata je zrušená, takže se na ni nikdo nehlásí.";

  if (stav === "Planovany" || stav === "Potvrzeny")
    return "Přihlášky zatím nejsou otevřené. Otevřou se, až pořadatel regatu vypíše.";

  return "Na tuhle regatu se nikdo nepřihlásil.";
}
