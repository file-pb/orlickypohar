import { casPraha, nactiOrlik, zmenaCm } from "@/lib/vodocet";
import { VodocetGraf } from "@/app/vodocet-graf";

/**
 * Vodočet Orlíku do boku (Filip, 16. 9. 2026): velké číslo hladiny se
 * šipkou, jestli stoupá, nebo klesá, graf hladiny za posledních 24 hodin
 * a přítok a odtok.
 *
 * <b>Přítok a odtok za posledních 24 h</b>, spočítané z naměřených řad,
 * ne okamžitá hodnota krát den (Filip, 16. 9. 2026). Tak je vidět, kolik
 * vody skutečně přiteklo a odteklo. Dokud API nemá nasbíraný celý den,
 * místo čísla stojí, že se sbírá.
 *
 * Graf je SVG přímo ve stránce — bez knihovny a bez javascriptu. Když se
 * data nepodaří načíst, widget chybí.
 */

const HODIN_ZMENY = 6;

const f = (n: number, mist: number) =>
  n.toLocaleString("cs-CZ", { minimumFractionDigits: mist, maximumFractionDigits: mist });

export async function BokVodocet() {
  const stav = await nactiOrlik();
  if (!stav) return null;

  const zmena = zmenaCm(stav.historie, HODIN_ZMENY);
  const smer = zmena > 0 ? "stoupa" : zmena < 0 ? "klesa" : "stoji";
  const veta =
    zmena === 0
      ? `Hladina se za ${HODIN_ZMENY} h nezměnila`
      : `Hladina ${zmena > 0 ? "stoupá" : "klesá"} o ${Math.abs(zmena)} cm za ${HODIN_ZMENY} h`;

  return (
    <section className="vodocet">
      <h2 className="bok-nadpis">Orlík · vodočet</h2>
      <div className="vodocet-hlava">
        <span className={`vodocet-sipka ${smer}`} aria-hidden="true">
          {zmena > 0 ? "↑" : zmena < 0 ? "↓" : "→"}
        </span>
        <b className="vodocet-hladina">{f(stav.hladina, 2)}</b>
        <span className="vodocet-jednotka">m n. m.</span>
      </div>
      {/* Hlavička mluví o posledních šesti hodinách schválně: je to „co se
          děje teď", ne přehled za vybrané období. Ten je pod grafem a řídí
          se tlačítky. */}
      <p className="vodocet-zmena">{veta}</p>

      {/* Graf i čísla pod ním patří k vybranému rozsahu, takže je kreslí
          jedna komponenta. Server dodá to, co platí pro 24 h, aby widget
          něco ukazoval i bez javascriptu. */}
      <VodocetGraf
        vychozi={{
          body: stav.historie,
          pritok: stav.pritokZaDen ?? null,
          odtok: stav.odtokZaDen ?? null,
          zmenaObjemu: stav.zmenaObjemu ?? null,
          zmenaHladinyCm: null,
        }}
        rozsahy={stav.dostupneRozsahy}
        pritokTed={stav.pritok ?? null}
        odtokTed={stav.odtok ?? null}
        objem={stav.objem ?? null}
      />

      <p className="bok-dal">
        <a href={stav.zdroj} target="_blank" rel="noopener noreferrer">
          Povodí Vltavy · {casPraha(stav.cas)}
        </a>
      </p>
    </section>
  );
}
