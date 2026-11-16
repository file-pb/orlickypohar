// NEEDITUJ TENHLE SOUBOR. Je to kopie z `packages/stavba/hranice.ts`,
// kterou vyrábí `packages/stavba/rozkopiruj.sh`. Změna patří do zdroje;
// tahle kopie se při příštím běhu přepíše a CI rozdíl ohlásí.
/**
 * Kde smí poloha ležet, aby se dala vzít vážně.
 *
 * <b>Tohle není geofence, je to kontrola překlepu.</b> Pravidlo vzniklo
 * 5. 10. 2026 s pípnutím bóje (`474c78a`) a mělo jediný úkol: chytit
 * prohozenou šířku s délkou. Mapy.com dávají v `id` délku první, Google
 * ve `/maps/search/` šířku — a bóje postavená z prohozené dvojice leží
 * v Africe, kde si jí nikdo nevšimne, protože na mapě trati prostě není.
 *
 * <para>
 * <b>Proč Česko a ne Orlík</b> (16. 11. 2026). Do té doby tu stál
 * obdélník 49,2–49,8 / 14,0–14,5, tedy přehrada s rezervou. Na kontrolu
 * překlepu je to mnohem přísnější, než je potřeba, a ta přísnost měla
 * vedlejší účinek, který nikdo nechtěl: <b>pípnout nešlo nikde jinde než
 * na Orlíku</b>. Stavitele trati v appce tím nebylo kde vyzkoušet —
 * průvodce došel ke kroku „Pípni" a odmítl polohu, protože telefon byl
 * v Praze. Zkouška na suchu je přitom to jediné, co se dá udělat dřív,
 * než se vypluje.
 * </para>
 *
 * <para>
 * <b>Rozvolnění kontrolu nezeslabuje, a to je na tom to podstatné.</b>
 * Šířka v Česku je 48,5–51,1, délka 12,0–18,9 — <b>ty dva intervaly se
 * nepřekrývají</b> (48,5 je víc než 18,9), takže žádné číslo nemůže být
 * zároveň platnou šířkou i platnou délkou. Prohozená dvojice se proto
 * pozná úplně stejně jednoznačně jako dřív, a `podleCeska` ve webovém
 * čtení souřadnic má pořád z čeho vybírat. Kdyby se hranice jednou
 * rozšiřovaly dál, tohle je ta vlastnost, která se musí ohlídat:
 * jakmile se intervaly překryjí, dvojice bez udaného pořadí přestane
 * být čitelná.
 * </para>
 *
 * <para>
 * <b>Autorita je server</b> (`Pipnuti.SirkaOd`… v `Features/Boje/Boje.cs`).
 * Tohle je kopie pro klienty, aby prvek, který by server odmítl, vůbec
 * nevznikl — v appce by se zařadil do fronty a <b>zastavil ji celou</b>.
 * Když se čísla jednou rozejdou, platí server.
 * </para>
 */

export const SIRKA_OD = 48.5;
export const SIRKA_DO = 51.1;
export const DELKA_OD = 12.0;
export const DELKA_DO = 18.9;

/**
 * Leží bod v Česku? Jedna funkce, protože čtyři konstanty skládané do
 * podmínky na několika místech se jednou rozejdou.
 */
export const vCesku = (sirka: number, delka: number) =>
  sirka >= SIRKA_OD && sirka <= SIRKA_DO && delka >= DELKA_OD && delka <= DELKA_DO;
