/**
 * Body k vypsání.
 *
 * <b>Od 6. 11. 2026 nejsou celé</b> (ZPJ A7, nález K7): dvě lodě ve shodě
 * dělí body za obsazená místa rovným dílem, takže vyjde 3,5. Celé číslo
 * se ale musí psát jako celé — „4,0" by vypadalo, jako by byla shoda i tam,
 * kde žádná není.
 *
 * Desetinná čárka, ne tečka: je to číslo pro českého čtenáře, ne pro kód.
 *
 * Stejná funkce je ve webu (`web/app/body.ts`) — appka z něj nesmí
 * importovat, takže je to vědomá dvojice, ne nedopatření.
 */
export const body = (n: number) =>
  n.toLocaleString("cs-CZ", { maximumFractionDigits: 1 });
