import Link from "next/link";

/**
 * Drobečková navigace. Poslední položka je místo, kde stojíš, takže není
 * odkaz — odkaz sám na sebe je jen šum, stejně jako „Domů" na domovské
 * stránce.
 *
 * Skládá se z toho, co stránka stejně zná; nic se pro ni nenačítá. Nahrazuje
 * dřívější „← zpět na ročník", což byla drobečková navigace pro jedinou
 * úroveň — jenže z ní nešlo skočit dál než o krok.
 *
 * <b>Odkaz na poslední položce se zahazuje tady</b>, ne u každé stránky:
 * půlka cest ve správě začíná „hlavou", která se vykreslí i ve stavu
 * „nemáš práva", a ta hlava pak nese tentýž seznam jako celá stránka. Kdyby
 * si každá sama rozhodovala, jestli poslední drobeček odkaz má, bylo by to
 * patnáct míst, kde se to dá splést.
 */
export type Drobek = { text: string; kam?: string };

export function Drobecky({ cesta }: { cesta: Drobek[] }) {
  return (
    <nav className="drobecky" aria-label="Kde jsem">
      {cesta.map((d, i) => {
        const kam = i === cesta.length - 1 ? undefined : d.kam;

        return (
          <span key={`${d.text}-${i}`}>
            {/* Oddělovač patří před položku, ne za ni — za poslední by visel
                do prázdna. */}
            {i > 0 && <span className="oddelovac" aria-hidden="true">»</span>}
            {kam ? <Link href={kam}>{d.text}</Link> : <span aria-current="page">{d.text}</span>}
          </span>
        );
      })}
    </nav>
  );
}

/**
 * Cesta ve správě. <b>Skládá se z adresy, ne z toho, odkud kdo přišel</b> —
 * a to je ta oprava: drobečky říkaly „Domů » Ročník » Správa" a mířily
 * „Ročník" na veřejnou stránku, takže vypadaly jako cesta nahoru, a přitom
 * ze správy vedly ven. U bójí a směrnic zase začínaly „Domů » Kalendář",
 * ačkoliv se na ně chodí z rozcestníku ročníku (Filip, 9. 10. 2026:
 * „nahoře se mi cesta nějak přehodí a to neodpovídá realitě").
 *
 * Tvar je tedy vždycky <b>Domů » Správa » Ročník » …</b>, protože tak jdou
 * za sebou i adresy: `/sprava`, `/sprava/{ročník}`, a pod ním ostatní.
 *
 * „Ročník" se jmenuje „Ročník" a ne svým názvem schválně: název má
 * „Orlický pohár 2026 (nanečisto)" dvacet osm znaků a na telefonu by
 * z drobečků udělal odstavec. Jméno ročníku stojí v podtitulku stránky.
 *
 * `serie` je `null` u věcí mimo ročník (náklady, oprávnění na celý web).
 */
export function drobeckySpravy(serie: string | null, dal: Drobek[] = []): Drobek[] {
  return [
    { text: "Domů", kam: "/" },
    { text: "Správa", kam: "/sprava" },
    ...(serie ? [{ text: "Ročník", kam: `/sprava/${encodeURIComponent(serie)}` }] : []),
    ...dal,
  ];
}

/**
 * Drobeček jedné regaty. Míří na <b>její kartu na rozcestníku ročníku</b>,
 * kde jsou všechny čtyři věci k ní pohromadě (výsledky, přihlášky, směrnice,
 * bóje) — a odtud se na tyhle obrazovky doopravdy chodí. Vlastní stránka
 * „regata ve správě" neexistuje a nepotřebuje být: ta karta je ona.
 */
export function drobekRegaty(serie: string, zavod: string, nazev?: string | null): Drobek {
  return {
    text: nazev ?? "Regata",
    kam: `/sprava/${encodeURIComponent(serie)}#${encodeURIComponent(zavod)}`,
  };
}
