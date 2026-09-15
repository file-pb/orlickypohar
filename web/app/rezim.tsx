/**
 * Přepínač světlého a tmavého vzhledu v hlavičce (Filip, 16. 9. 2026).
 *
 * <b>Bez javascriptu.</b> Server neví, jaký vzhled má čtenář v systému,
 * takže nemůže sám vybrat, kterou ikonu ukázat. Vykreslí proto obě —
 * měsíc přepíná na tmavý, slunce na světlý — a CSS nechá vidět tu, která
 * vede k opačnému vzhledu, než je právě na obrazovce. CSS aktuální vzhled
 * zná vždycky, i bez uložené volby.
 *
 * Tlačítko je formulář s POST na `/rezim`; ta uloží volbu do cookie
 * a vrátí na tutéž stránku.
 */
export function PrepinacRezimu() {
  return (
    <div className="rezim">
      <form method="post" action="/rezim" className="rezim-na-tmavy">
        <input type="hidden" name="na" value="tmavy" />
        <button type="submit" aria-label="Přepnout na tmavý vzhled" title="Tmavý vzhled">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1Z" />
          </svg>
        </button>
      </form>
      <form method="post" action="/rezim" className="rezim-na-svetly">
        <input type="hidden" name="na" value="svetly" />
        <button type="submit" aria-label="Přepnout na světlý vzhled" title="Světlý vzhled">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
          </svg>
        </button>
      </form>
    </div>
  );
}
