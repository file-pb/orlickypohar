import type { ZavodDetail } from "@/lib/api";
import { AUTOR_FOTEK, fotkaClanku } from "@/app/fotky";

type Poradatel = NonNullable<ZavodDetail["medailonek"]>;

/**
 * Má medailonek co říct nad rámec jména? Samotné jméno už stojí
 * v podtitulku regaty — karta jen s ním a s ilustrační fotkou by byla
 * prázdná krabice, která tvrdí, že o klubu něco víme. Vlastní fotka klubu
 * naproti tomu obsah je.
 */
export const maObsah = (p?: Poradatel | null): p is Poradatel =>
  !!p && !!(p.web || p.popis || p.email || p.telefon || p.kontaktniOsoba || p.adresa ||
    (p.sirka != null && p.delka != null) || p.obrazek);

/**
 * API adresu webu hlídá a jiné než http(s) neuloží. Kontroluje se to i tady,
 * protože adresa jde do `href` a web nemá věřit, že každé API, proti
 * kterému kdy poběží, je tak přísné.
 */
const bezpecnyWeb = (web?: string | null) => (web && /^https?:\/\//i.test(web) ? web : null);

/** Adresa bez schématu a koncového lomítka — čte se líp než celé URL. */
const citelnyWeb = (web: string) => web.replace(/^https?:\/\//i, "").replace(/\/$/, "");

/**
 * Odkazy na mapu místo vložené mapy. Vložená by při každém načtení stránky
 * posílala návštěvníka k cizí službě a chtěla souhlas; tečka na mapě to
 * nevyváží. Mapy.com čtou `center` jako délku a šířku, v tomhle pořadí.
 */
const mapy = (sirka: number, delka: number) => [
  {
    nazev: "Mapy.com",
    href: `https://mapy.com/fnc/v1/showmap?mapset=outdoor&center=${delka},${sirka}&zoom=16&marker=true`,
  },
  {
    nazev: "OpenStreetMap",
    href: `https://www.openstreetmap.org/?mlat=${sirka}&mlon=${delka}#map=16/${sirka}/${delka}`,
  },
];

/** Odkaz ven: nová karta a stránka na druhé straně nedostane `window.opener` ani referrer. */
function Ven({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="ven" aria-label="(otevře se v nové kartě)"> ↗</span>
    </a>
  );
}

/**
 * Medailonek pořadatele na stránce regaty (Filip, 15. 9. 2026): odkaz na
 * web, popis, kontakt, mapa a obrázek.
 *
 * <b>Ukazuje se jen to, co je vyplněné.</b> Jméno a telefon jsou osobní
 * údaje; nevyplněné pole je odpověď „tohle ven nechceme".
 *
 * <b>Fotka.</b> Nahraný obrázek klubu, pokud ho má. Jinak kurátorská fotka
 * z Orlíku od Jiřího Tašla — vybraná podle klíče, ať je u téhož klubu
 * vždycky táž, a bez popisku, jen s kreditem, stejně jako u článků. Ta
 * není fotka klubu a nesmí tak vypadat.
 */
export function Medailonek({ poradatel }: { poradatel: Poradatel }) {
  const web = bezpecnyWeb(poradatel.web);
  const foto = fotkaClanku(poradatel.slug);
  const souradnice = poradatel.sirka != null && poradatel.delka != null;
  const kontakt = poradatel.kontaktniOsoba || poradatel.email || poradatel.telefon || poradatel.adresa;

  return (
    <section className="medailonek" id="poradatel" aria-labelledby="poradatel-nadpis">
      {poradatel.obrazek ? (
        <figure className="medailonek-foto">
          <img
            src={poradatel.obrazek.nahled}
            alt={poradatel.obrazek.popis ?? ""}
            loading="lazy"
            decoding="async"
          />
          <figcaption>Foto {poradatel.obrazek.autor}</figcaption>
        </figure>
      ) : (
        <figure className="medailonek-foto">
          <picture>
            <source type="image/avif" srcSet={`/foto/${foto.soubor}-400.avif`} />
            <img src={`/foto/${foto.soubor}.jpg`} alt="" loading="lazy" decoding="async" />
          </picture>
          <figcaption>Foto {AUTOR_FOTEK}</figcaption>
        </figure>
      )}

      <div className="medailonek-text">
        <p className="medailonek-stitek">Pořádá</p>
        <h2 id="poradatel-nadpis">
          {web ? <Ven href={web}>{poradatel.nazev}</Ven> : poradatel.nazev}
        </h2>

        {poradatel.popis
          ?.split(/\n\s*\n/)
          .filter((odstavec) => odstavec.trim())
          .map((odstavec, i) => (
            <p key={i}>{odstavec.trim()}</p>
          ))}

        {(kontakt || web || souradnice) && (
          <dl className="pravidla medailonek-kontakt">
            {web && (
              <>
                <dt>Web</dt>
                <dd>
                  <Ven href={web}>{citelnyWeb(web)}</Ven>
                </dd>
              </>
            )}
            {poradatel.kontaktniOsoba && (
              <>
                <dt>Kontakt</dt>
                <dd>{poradatel.kontaktniOsoba}</dd>
              </>
            )}
            {poradatel.email && (
              <>
                <dt>E-mail</dt>
                <dd>
                  <a href={`mailto:${poradatel.email}`}>{poradatel.email}</a>
                </dd>
              </>
            )}
            {poradatel.telefon && (
              <>
                <dt>Telefon</dt>
                <dd>
                  <a href={`tel:${poradatel.telefon.replace(/[^\d+]/g, "")}`}>{poradatel.telefon}</a>
                </dd>
              </>
            )}
            {poradatel.adresa && (
              <>
                <dt>Adresa</dt>
                <dd>{poradatel.adresa}</dd>
              </>
            )}
            {souradnice && (
              <>
                <dt>Na mapě</dt>
                <dd>
                  {mapy(poradatel.sirka!, poradatel.delka!).map((m, i) => (
                    <span key={m.nazev}>
                      {i > 0 && " · "}
                      <Ven href={m.href}>{m.nazev}</Ven>
                    </span>
                  ))}
                </dd>
              </>
            )}
          </dl>
        )}
      </div>
    </section>
  );
}
