import Link from "next/link";
import { notFound } from "next/navigation";
import { Vypadek } from "@/app/vypadek";
import { Boky } from "@/app/boky";
import { HlavaZastavky } from "../hlava";
import { nactiZastavku } from "../data";
import { PrihlaseneLode } from "../sekce-lode";

export const dynamic = "force-dynamic";

type Parametry = {
  params: Promise<{ slug: string; zavod: string }>;
  searchParams: Promise<{ trida?: string }>;
};

export const metadata = { title: "Přihlášené lodě" };

/**
 * Kdo jede. Vlastní sekce, ne přívažek pod prázdnou tabulkou výsledků —
 * u regaty, která se teprve pojede, je to jediné, co je o ní známo.
 */
export default async function Lode({ params, searchParams }: Parametry) {
  const { slug, zavod: slugZavodu } = await params;
  const { trida } = await searchParams;

  const zastavka = await nactiZastavku(slug, slugZavodu);
  if (!zastavka) return <Vypadek co="Přihlášené lodě" />;

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
          <h2>Přihlášené lodě</h2>
          <p className="prazdno">
            {prihlasuje
              ? "Zatím se nikdo nepřihlásil — můžeš být první."
              : "Na tuhle regatu se nikdo nepřihlásil."}
          </p>
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
