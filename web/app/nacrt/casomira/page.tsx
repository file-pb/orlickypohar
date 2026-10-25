import type { Metadata } from "next";
import { PanylkyRozjizdek } from "@/app/serie/[slug]/zavody/[zavod]/tabule/rozjizdky";
import type { Snimek } from "@/lib/tabule";

/**
 * Jak vypadá časomíra a panýlky rozjížděk ve všech fázích závodního dne.
 *
 * <b>Proč stránka a ne screenshot tabule:</b> fáze se vylučují v čase —
 * na živé tabuli je vidět vždycky jen jedna a na zbytek by se čekalo
 * hodiny. Tady stojí pod sebou a dají se porovnat (Filip, 25. 10. 2026:
 * *„ukaž, jak by mohla vypadat?"*).
 */
export const metadata: Metadata = { title: "Náčrt: časomíra a rozjížďky" };

const START = Date.parse("2027-05-15T12:30:00+02:00");
const R = (cislo: number, stav: string, startV: string | null) =>
  ({ cislo, stav, stavVysledku: null, startV, doSerie: true, poradi: [] }) as unknown as
    Snimek["rozjizdky"][number];

/** Minuty před startem druhé rozjížďky, ať se fáze dají naskládat. */
const v = (minut: number) => START + minut * 60_000;

const faze: { kdy: string, co: string; ted: number; rozjizdky: Snimek["rozjizdky"] }[] = [
  {
    kdy: "11:40",
    co: "Dopoledne po první rozjížďce. Divák se ptá, kdy se zase pojede — odpovědí je hodina, ne odpočet.",
    ted: v(-50),
    rozjizdky: [R(1, "Dokoncena", null), R(2, "Planovana", "2027-05-15T12:30:00+02:00")],
  },
  {
    kdy: "12:27",
    co: "Tři minuty do startu. Odpočet svítí jako časomíra na stadionu — červená na tabuli znamená zrušeno, tak ji procedura nesmí brát.",
    ted: v(-3),
    rozjizdky: [R(1, "Dokoncena", null), R(2, "Planovana", "2027-05-15T12:30:00+02:00")],
  },
  {
    kdy: "12:42",
    co: "Jede se. Panýlek svítí výplní, ne jen barvou číslice — odjetá vedle něj je jen obtažená.",
    ted: v(12),
    rozjizdky: [R(1, "Dokoncena", null), R(2, "Probiha", "2027-05-15T12:30:00+02:00")],
  },
  {
    kdy: "13:20",
    co: "Po dojezdu, třetí čeká. Zrušená si nechá číslo přeškrtnuté, ať je po ní stopa.",
    ted: v(50),
    rozjizdky: [
      R(1, "Dokoncena", null),
      R(2, "Dokoncena", null),
      R(3, "Zrusena", null),
      R(4, "Planovana", "2027-05-15T14:30:00+02:00"),
    ],
  },
  {
    kdy: "17:10",
    co: "Po závodě. Není co odpočítávat, tak tu po časomíře nezbyde ani stopa.",
    ted: v(280),
    rozjizdky: [R(1, "Dokoncena", null), R(2, "Dokoncena", null), R(3, "Dokoncena", null)],
  },
];

export default function Stranka() {
  return (
    <div className="tabule ukazka-casomiry">
      <style>{`
        .ukazka-casomiry { min-height: 100vh; padding: 3vh 4vw; background: var(--pozadi); }
        .ukazka-casomiry .rozjizdky-panylky { position: static; }
        .ukazka-casomiry h1 { font-size: calc(1.6 * var(--tv)); margin: 0 0 2vh; }
        .ukazka-casomiry li { list-style: none; margin: 0 0 3.4vh; display: grid; gap: 0.8vh; }
        .ukazka-casomiry .kdy {
          font-variant-numeric: tabular-nums; font-weight: 700;
          font-size: calc(1 * var(--tv)); color: var(--text);
        }
        .ukazka-casomiry .co { font-size: calc(0.82 * var(--tv)); color: var(--tlumeny); max-width: 60ch; }
      `}</style>
      <h1>Časomíra a panýlky rozjížděk</h1>
      <ul style={{ margin: 0, padding: 0 }}>
        {faze.map((f) => (
          <li key={f.kdy}>
            <span className="kdy">{f.kdy}</span>
            <PanylkyRozjizdek snimek={{ rozjizdky: f.rozjizdky }} ted={f.ted} />
            <span className="co">{f.co}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
