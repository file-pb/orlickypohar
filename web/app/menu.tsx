import { ZavriMimo } from "@/app/zavri-mimo";
import { Domu } from "@/app/domu";
import { OdkazJinam } from "@/app/odkaz-jinam";

/**
 * Kebab (⋮) v hlavičce. Na očích zůstává jen značka a profil, zbytek webu
 * je o klepnutí dál — rozdělený podle toho, kdo přišel.
 *
 * Filip, 15. 9. 2026: schovat vždycky, nejen na telefonu. Hlavička je pak
 * na všech šířkách stejná a klidná a nabídka se dá doplňovat, aniž by se
 * řádek menu začal lámat.
 *
 * Postavené stejně jako profil: `<details>` rozbalí prohlížeč sám a
 * `ZavriMimo` jen doplní zavření klepnutím jinam a na Escape.
 */
export function Menu({
  rocnik,
  rucniRezim,
}: {
  rocnik?: { slug: string; rok: number };
  /** Vzhled je přepnutý ručně — nabídne se návrat k systému. */
  rucniRezim?: boolean;
}) {
  return (
    <details className="menu">
      <ZavriMimo />
      <summary aria-label="Další stránky" title="Další stránky">
        <span aria-hidden="true">⋮</span>
      </summary>
      <div className="nabidka">
        {/* <b>Rozdělené podle toho, kdo přišel</b> (Filip, postřeh 7
            v `docs/PLAN.md`): *„Veřejnou navigaci strukturovat podle toho,
            kdo přišel — Závodím / Fandím — a vedle toho Legislativa."*
            Plochý seznam osmi odkazů nutil číst všechny; takhle se čte
            jen ta třetina, která se mě týká.

            <b>Nadpisy, ne vnořená rozbalovátka.</b> Nabídka je sama
            `details` a druhé patro by znamenalo dvě klepnutí k položce,
            která je přitom vidět. Skupiny jsou tři a vejdou se celé. */}

        <strong className="skupina">Závodím</strong>
        <OdkazJinam href="/moje-lode">Moje lodě</OdkazJinam>
        <OdkazJinam href="/pripojeni">Připojit se k lodi</OdkazJinam>
        {/* Appka je tu, ne u fandění: záznam trasy a upozornění na start
            jsou pro toho, kdo jede. Divákovi stačí web. */}
        <OdkazJinam href="/appka">Appka do telefonu</OdkazJinam>

        <strong className="skupina">Fandím</strong>
        {/* Na širokém displeji stojí ročník a pořadí v hlavičce, na úzkém
            se nevejdou — tady jsou pro obě šířky, protože skupina, ve
            které chybí to hlavní, se čte jako nekompletní. */}
        {rocnik && (
          <>
            <OdkazJinam href={`/serie/${rocnik.slug}`}>Ročník {rocnik.rok}</OdkazJinam>
            <OdkazJinam href={`/serie/${rocnik.slug}/poradi`}>Průběžné pořadí</OdkazJinam>
          </>
        )}
        {/* <b>Tabule tu nestojí</b> (Filip, 13. 11. 2026: *„tady máme
            zdvojení, volání, tak to nechme jen od té regaty"*). Vedly na ni
            dvě cesty — tahle a odkaz u regaty — a tahle navíc přes
            rozcestník, který si musel dotáhnout ročník i jeho závody, aby
            zjistil, kam vlastně poslat. Tabule patří závodu, takže se na ni
            chodí od závodu.

            Adresa `/tabule` zůstala: na televizi v hospodě se jeden krátký
            řetězec naťuká, kdežto celá cesta se závodem ne. Není to druhá
            cesta v nabídce, je to zkratka pro toho, kdo ji zná z nápovědy. */}
        <OdkazJinam href="/historie">Historie série</OdkazJinam>

        <strong className="skupina">Legislativa</strong>
        <OdkazJinam href="/pravidla">Pravidla</OdkazJinam>
        <OdkazJinam href="/napoveda">Nápověda</OdkazJinam>
        <OdkazJinam href="/osobni-udaje">Osobní údaje</OdkazJinam>

        {/* <b>Domů odešlo z hlavičky sem</b> (Filip, postřeh 2: *„horní
            menu se zkrátí na Ročník a Domů se nakonec schová"*). Cesta
            domů nezmizela — nese ji značka vlevo, na kterou se kliká
            odjakživa. Vypsaný odkaz vedle ní byl druhá cesta k témuž
            a bral místo, které v hlavičce není.

            `OdkazJinam` ho na domovské stránce vynechá sám. */}
        <Domu />

        {/* Jen když je vzhled přepnutý ručně: bez toho by se z ruční volby
            nedalo vrátit k systému jinak než smazáním cookie. */}
        {rucniRezim && (
          <form method="post" action="/rezim">
            <input type="hidden" name="na" value="system" />
            <button type="submit">Vzhled podle systému</button>
          </form>
        )}
      </div>
    </details>
  );
}
