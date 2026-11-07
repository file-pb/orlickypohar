import Svg, { Rect } from 'react-native-svg';

import type { Barvy } from '@/constants/theme';

/**
 * Ikonka baterie, jak ji kreslí návrh (`Zavodnik.dc.html`, `Jede.dc.html`):
 * obrys s kontaktem a výplň podle procent.
 *
 * <b>Proč obrázek, a ne jen číslo.</b> Procenta se čtou, obrys se zahlédne —
 * a tahle informace se čte na slunci, v pohybu a koutkem oka. Barva nese
 * totéž co výplň, takže kdo barvy nerozlišuje, pozná stav z délky.
 *
 * <b>Vlastní baterii si posádka v appce nehledá</b> (Filip, 26. 10. 2026:
 * *„baterii v apce nepotřebujeme zobrazovat, to uživatel vidí na telefonu
 * nativně"*). Tahle ikonka je o <b>cizích</b> telefonech — kolegy na lodi
 * a startéra, kterému se předává velení.
 */
export function Baterie({
  procent,
  t,
  sirka = 26,
}: {
  procent: number;
  t: Barvy;
  sirka?: number;
}) {
  const vyska = (sirka / 26) * 14;
  // Meze jsou z návrhu: 78 % zelená, 41 % jantarová. Dvacet procent je ta
  // hranice, za kterou telefon regatu nedojede — spotřeba je změřená,
  // 1,96 % za hodinu se zhasnutým displejem (`KlicLodi.BaterieProcent`),
  // ale s běžící GPS je mnohonásobně vyšší.
  const barva = procent <= 20 ? t.stavZruseny : procent <= 50 ? t.vystraha : t.stavVypsany;

  return (
    <Svg width={sirka} height={vyska} viewBox="0 0 26 14">
      <Rect
        x={0.75}
        y={0.75}
        width={21.5}
        height={12.5}
        rx={3}
        fill="none"
        stroke={t.tlumeny}
        strokeWidth={1.5}
      />
      <Rect x={23.5} y={4.5} width={2.5} height={5} rx={1.2} fill={t.tlumeny} />
      {procent > 0 ? (
        <Rect
          x={2.5}
          y={2.5}
          width={Math.max(1.5, (Math.min(100, procent) / 100) * 18)}
          height={9}
          rx={1.5}
          fill={barva}
        />
      ) : null}
    </Svg>
  );
}
