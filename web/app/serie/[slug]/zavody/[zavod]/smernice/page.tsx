import { notFound } from "next/navigation";
import { Vypadek } from "@/app/vypadek";
import { Boky } from "@/app/boky";
import { HlavaZastavky } from "../hlava";
import { nactiZastavku } from "../data";
import { SekceSmernice } from "../sekce-smernice";
import { SekcePravidla } from "../sekce-pravidla";

export const dynamic = "force-dynamic";

type Parametry = { params: Promise<{ slug: string; zavod: string }> };

export const metadata = { title: "Plachetní směrnice" };

/**
 * Podle čeho se jede: plachetní směrnice a bodovací pravidla téhle regaty.
 *
 * <b>Vlastní adresa kvůli odkazu.</b> Směrnice se vyvěšuje právě proto, aby
 * šel poslat odkaz (plán, oddíl *Úvodník a taby*) — a dřív vedl jen na celou
 * stránku regaty, kde se pod ní válely výsledky.
 *
 * <b>Pravidla závodu jsou tady, ne u výsledků.</b> Škrty a koeficient se
 * vydávají proto, aby šlo výsledky zkontrolovat — ale platí od vypsání,
 * ne až po dojezdu, a patří k tomu, podle čeho se jede.
 */
export default async function Smernice({ params }: Parametry) {
  const { slug, zavod: slugZavodu } = await params;

  const zastavka = await nactiZastavku(slug, slugZavodu);
  if (!zastavka) return <Vypadek co="Plachetní směrnice" />;

  const { detail, trat } = zastavka;
  // Komunitní akce se nejede podle směrnice a žádná sem nevede.
  if (detail.druh === "Akce") notFound();

  return (
    <Boky serie={slug}>
      <HlavaZastavky
        serie={slug}
        zavod={slugZavodu}
        detail={detail}
        trat={trat}
        aktivni="smernice"
      />
      <SekceSmernice smernice={detail.smernice} />
      {/* Skryté výsledky: „Do poháru" by muselo prozradit počet rozjížděk
          u ročníku, který je schválně nevydává. */}
      {!detail.vysledkySkryte && <SekcePravidla zavod={detail} serie={slug} />}
    </Boky>
  );
}
