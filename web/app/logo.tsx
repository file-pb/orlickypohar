import { ORLIK_YACHT_SERIES } from "@/app/znacka-orlik-yacht-series";

/**
 * Logo Orlik Yacht Series od rozhodčího seriálu (Filip, 22. 9. 2026).
 *
 * Tvary jsou z jeho vektoru (`web/grafika/orlik-yacht-series/`), převádí
 * je `web/scripts/logo.py`. Web je kreslí přímo do stránky, ne přes `<img>`,
 * aby barvu dávalo CSS: tmavě modrá z předlohy by v tmavém vzhledu na
 * tmavém podkladu zmizela.
 *
 * Logo je kulaté, takže na rozdíl od původního nepotřebuje zvláštní verzi
 * pro mobil. Původní logo je v `app/logo-puvodni.tsx`.
 */
function Kresba({ className }: { className: string }) {
  return (
    <svg className={className} viewBox={ORLIK_YACHT_SERIES.viewBox} aria-hidden="true" focusable="false">
      <path d={ORLIK_YACHT_SERIES.nonzero} />
      <path d={ORLIK_YACHT_SERIES.evenodd} fillRule="evenodd" />
    </svg>
  );
}

export function Logo() {
  return <Kresba className="logo logo-oys" />;
}

/**
 * Logo jako slabý rozostřený vodoznak na pozadí stránek. Průhlednost
 * a rozostření mu dává CSS.
 */
export function ZnakPozadi() {
  return <Kresba className="logo-oys pozadi-znak" />;
}
