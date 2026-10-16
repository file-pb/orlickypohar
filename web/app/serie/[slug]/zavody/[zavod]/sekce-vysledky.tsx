import type { BodyVRozjizdce, Rozjizdka, Vysledek, ZavodDetail } from "@/lib/api";
import { CELKEM } from "@/app/tridy";

/** Jeden řádek tabulky: loď, její body a co v které rozjížďce dokázala. */
export type Radek = {
  lod: string;
  kategorie: string;
  kormidelnik: string | null;
  body: number;
  poradi: number;
  bunky: (Bunka | undefined)[];
};

type Bunka = { vysledek?: Vysledek; body?: BodyVRozjizdce };

/**
 * API vydává výsledky po rozjížďkách, protože tak vznikají. Číst se ale musí
 * po lodích — divák hledá svoji loď, ne třetí rozjížďku. Převod je tady,
 * ne v API: je to věc zobrazení, a mobilní appka bude chtít jiné.
 *
 * Body a pořadí se ale <b>nepočítají</b> — ty vydává API. Dokud počítání
 * neexistovalo, sčítal si je web sám; teď by se ta dvě čísla při první změně
 * pravidla rozešla a hádalo by se, které je pravda.
 */
export function naRadky(zavod: ZavodDetail, poradi = zavod.poradi): Radek[] {
  const vysledky = new Map<string, Map<number, Vysledek>>();
  for (const r of zavod.rozjizdky)
    for (const v of r.vysledky) {
      if (!vysledky.has(v.lod)) vysledky.set(v.lod, new Map());
      vysledky.get(v.lod)!.set(r.cislo, v);
    }

  const kormidelnici = new Map(
    [...vysledky].map(([lod, podleCisla]) => [lod, [...podleCisla.values()][0].kormidelnik]),
  );

  return poradi
    .map((v) => ({
      lod: v.lod,
      kategorie: v.kategorie,
      kormidelnik: kormidelnici.get(v.lod) ?? null,
      body: v.body,
      poradi: v.poradi,
      bunky: zavod.rozjizdky.map((r) => {
        const vysledek = vysledky.get(v.lod)?.get(r.cislo);
        const body = v.rozjizdky.find((b) => b.cislo === r.cislo);
        return vysledek || body ? { vysledek, body } : undefined;
      }),
    }))
    .sort((a, b) => a.poradi - b.poradi);
}

export function Tabulka({
  kategorie,
  radky,
  rozjizdky,
}: {
  kategorie: string;
  radky: Radek[];
  rozjizdky: Rozjizdka[];
}) {
  return (
    // Třídu nese tab nad tabulkou. Když je třída jediná a taby nejsou,
    // dá nadpis stránka (`NadpisTridy`) — jinak by nebylo poznat, čí jsou
    // to výsledky.
    <div className="tabulka-sekce">
      <div className="tabulka-obal">
        <table>
          <thead>
            <tr>
              <th className="lod">Loď</th>
              {/* Body hned za jménem, ne na konci řádku. Na telefonu se
                  tabulka posouvá vodorovně a číslo, kvůli kterému se divák
                  dívá, musí zůstat vidět bez posouvání. */}
              <th className="body">Body</th>
              {/* Zrušená rozjížďka ve sloupcích zůstává (Filip, 17. 10.
                  2026) — kdyby zmizela, divák by jen viděl, že v řadě
                  chybí číslo. Přeškrtnutá říká proč. Body v ní nikdo
                  nemá, protože se nepočítá; co kdo dojel, než se zrušila,
                  ve sloupci vidět je. */}
              {rozjizdky.map((r) => (
                <th
                  key={r.cislo}
                  className={
                    [r.doSerie ? "" : "mimo-serii", r.stav === "Zrusena" ? "zrusena" : ""]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                >
                  {r.stav === "Zrusena" ? (
                    <span title="rozjížďka zrušená, nepočítá se">{r.cislo}.</span>
                  ) : (
                    <>
                      {r.cislo}.{!r.doSerie && <span title="nepočítá se do poháru">*</span>}
                    </>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {radky.map((radek) => (
              <tr key={radek.lod}>
                <td className="lod">
                  <span className="poradi-cislo">{radek.poradi}.</span> {radek.lod}
                  {/* V celém poli je vidět, ze které kategorie loď je —
                      jinde ji nese tab nad tabulkou. */}
                  {(radek.kormidelnik || kategorie === CELKEM) && (
                    <div className="majitel">
                      {radek.kormidelnik}
                      {kategorie === CELKEM && (
                        <span className="stitek kategorie-lodi">{radek.kategorie}</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="body">{radek.body}</td>
                {radek.bunky.map((b, i) => (
                  <td key={i} className={b?.body?.skrtnuto ? "cislo skrtnuto" : "cislo"}>
                    {bunka(b)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function bunka(b?: Bunka) {
  if (!b?.body) return "—";
  return (
    <>
      {b.body.body}
      {b.vysledek?.kod && <span className="znacka">{b.vysledek.kod.toUpperCase()}</span>}
    </>
  );
}
