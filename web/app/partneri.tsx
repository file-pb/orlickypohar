/**
 * Pás partnerů a sponzorů jako pevný pruh u spodku okna (Filip,
 * 15. 9. 2026). Je na očích pořád, proto je nízký a nadpis nese jen pro
 * čtečku obrazovky; výšku a odsazení stránky řídí CSS proměnná `--paticka`.
 *
 * <b>Loga jsou zatím ukázková</b> (Filip, 15. 9. 2026: postavit místo,
 * skutečná loga pošle). Jsou nakreslená jako zjevné zástupné značky, ne
 * převzatá od skutečných organizací — na veřejném webu by cizí logo
 * tvrdilo, že nás ta organizace podporuje. Až dorazí skutečná, vymění se
 * seznam níž a soubory v `public/partneri/`.
 *
 * <b>Posouvá se v CSS</b>, bez javascriptu. Seznam je v pásu dvakrát za
 * sebou, aby posun šel dokola bez skoku; druhá kopie je pro čtečky
 * obrazovky skrytá. Najetím myší se pás zastaví, a kdo má v systému
 * vypnuté animace, dostane loga v klidu vedle sebe.
 */

type Partner = { nazev: string; logo: string; odkaz?: string };

const PARTNERI: Partner[] = [
  { nazev: "Loděnice Příklad", logo: "/partneri/lodenice.svg" },
  { nazev: "Plachty Vzor", logo: "/partneri/plachty.svg" },
  { nazev: "Marina Ukázka", logo: "/partneri/marina.svg" },
  { nazev: "Jachtklub Model", logo: "/partneri/jachtklub.svg" },
  { nazev: "Pivovar Maketa", logo: "/partneri/pivovar.svg" },
];

/** Dokud jsou v seznamu jen ukázková loga, pás to říká nahlas. */
const UKAZKA = true;

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
  const obrazek = <img src={partner.logo} alt={skryte ? "" : partner.nazev} width={200} height={50} />;

  // Bez odkazu jen obrázek: odkaz, který nikam nevede, je slib naprázdno.
  return partner.odkaz ? (
    <a href={partner.odkaz} target="_blank" rel="noopener noreferrer" tabIndex={skryte ? -1 : undefined}>
      {obrazek}
    </a>
  ) : (
    <span>{obrazek}</span>
  );
}
