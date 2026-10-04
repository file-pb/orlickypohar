/**
 * Pás partnerů a sponzorů jako pevný pruh u spodku okna (Filip,
 * 15. 9. 2026). Je na očích pořád, proto je nízký a nadpis nese jen pro
 * čtečku obrazovky; výšku a odsazení stránky řídí CSS proměnná `--paticka`.
 *
 * <b>Skuteční partneři od 22. 9. 2026</b> (Filip): ČSJ, Marina Orlík,
 * Stingray, Hacjacht, Yacht Club Písek, Colins Yacht Club, FUCK CANCER
 * a Milan Koláček Racing. Loga jsou převzatá z jejich webů, odkazy vedou
 * do nové karty. Ukázková loga z 15. 9. jsou pryč; najdeš je v historii
 * gitu, kdyby bylo potřeba znovu zkoušet rozložení.
 *
 * <b>Posouvá se v CSS</b>, bez javascriptu. Seznam je v pásu dvakrát za
 * sebou, aby posun šel dokola bez skoku; druhá kopie je pro čtečky
 * obrazovky skrytá. Najetím myší se pás zastaví, a kdo má v systému
 * vypnuté animace, dostane loga v klidu vedle sebe.
 */

/**
 * `tmave`: logo je světlé (bílé) a na bílé dlaždici by zmizelo. Logo se
 * nepřebarvuje — je to cizí značka — dostane tmavou dlaždici.
 */
type Partner = { nazev: string; logo: string; odkaz?: string; tmave?: boolean };

const PARTNERI: Partner[] = [
  { nazev: "Český svaz jachtingu", logo: "/partneri/csj.webp", odkaz: "https://www.sailing.cz/" },
  { nazev: "Marina Orlík", logo: "/partneri/marina-orlik.svg", odkaz: "https://www.marinaorlik.cz/" },
  { nazev: "Stingray", logo: "/partneri/stingray.webp", odkaz: "https://www.stingray.cz/" },
  { nazev: "Hacjacht", logo: "/partneri/hacjacht.webp", odkaz: "https://www.hacjacht.cz/" },
  // Znak YCPk od Filipa (PDF z CorelDRAW), modrá varianta.
  { nazev: "Yacht Club Písek", logo: "/partneri/yc-pisek.webp", odkaz: "https://yachtclubpisek.cz/" },
  { nazev: "Colins Yacht Club", logo: "/partneri/cyc.webp", odkaz: "https://cyc.cz/" },
  { nazev: "FUCK CANCER", logo: "/partneri/fuck-cancer.svg", odkaz: "https://www.fuckcancer.cz/" },
  {
    nazev: "Milan Koláček Racing",
    logo: "/partneri/milan-kolacek.svg",
    odkaz: "https://milankolacek.eu/CZ/index.html",
    tmave: true,
  },
]

/** Dokud jsou v seznamu jen ukázková loga, pás to říká nahlas. */
const UKAZKA = false;

export function Partneri() {
  if (PARTNERI.length === 0) return null;

  return (
    <section className="partneri" aria-labelledby="partneri-nadpis">
      <h2 id="partneri-nadpis">
        Partneři a sponzoři
        {UKAZKA && <span className="stitek">ukázková loga</span>}
      </h2>
      <div className="partneri-okno">
        <ul className="partneri-pas">
          {[0, 1].map((kopie) =>
            PARTNERI.map((p) => (
              <li key={`${kopie}-${p.nazev}`} aria-hidden={kopie === 1 || undefined}>
                <Logo partner={p} skryte={kopie === 1} />
              </li>
            )),
          )}
        </ul>
      </div>
    </section>
  );
}

function Logo({ partner, skryte }: { partner: Partner; skryte: boolean }) {
  // Pás stojí na konci stránky, takže se loga načtou, až se k nim doroluje.
  // Dřív se stahovala hned a dvakrát (pás je v HTML dvakrát kvůli plynulé
  // smyčce) — na mobilním připojení to bylo 135 kB navíc, než se ukázalo
  // cokoliv (změřeno 4. 10. 2026).
  const obrazek = (
    <img
      src={partner.logo}
      alt={skryte ? "" : partner.nazev}
      width={200}
      height={50}
      loading="lazy"
      decoding="async"
    />
  );

  // Bez odkazu jen obrázek: odkaz, který nikam nevede, je slib naprázdno.
  const trida = partner.tmave ? "tmave" : undefined;

  return partner.odkaz ? (
    <a
      href={partner.odkaz}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={skryte ? -1 : undefined}
      className={trida}
    >
      {obrazek}
    </a>
  ) : (
    <span className={trida}>{obrazek}</span>
  );
}
