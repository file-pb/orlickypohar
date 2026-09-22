import { LOGO } from "@/app/znacka-loga";
import { ORLIK_YACHT_SERIES } from "@/app/znacka-orlik-yacht-series";

/**
 * Logo Orlik Yacht Series od rozhodčího seriálu (Filip, 22. 9. 2026).
 *
 * Tvary jsou z jeho vektoru (`web/grafika/orlik-yacht-series/`), převádí
 * je `web/scripts/logo.py`. Web je kreslí přímo do stránky, ne přes `<img>`,
 * aby barvu dávalo CSS: tmavě modrá z předlohy by v tmavém vzhledu na
 * tmavém podkladu zmizela.
 *
 * Kruh je kulatý, takže na rozdíl od původního loga nepotřebuje zvláštní
 * verzi pro mobil; tu má jen nápis vedle něj. Původní logo je
 * v `app/logo-puvodni.tsx`.
 */
function Kresba({ className }: { className: string }) {
  return (
    <svg className={className} viewBox={ORLIK_YACHT_SERIES.viewBox} aria-hidden="true" focusable="false">
      <path d={ORLIK_YACHT_SERIES.nonzero} />
      <path d={ORLIK_YACHT_SERIES.evenodd} fillRule="evenodd" />
    </svg>
  );
}

/**
 * Nápis Orlický pohár vedle kulatého loga (Filip, 22. 9. 2026): „jak jsme
 * měli u předchozího loga, ale aby nepřekrýval nové logo a měl trochu
 * odstup“. Křivky i proužky jsou tytéž jako v původním logu
 * (`znacka-loga.ts` z `app/scripts/ikona.py`), jen bez plachet: na monitoru
 * v jednom řádku, na mobilu ve dvou, jako byl vodoznak čtvercové značky.
 * Výřezy pohledu jsou ořezané na samotný nápis.
 */
const NAPIS = {
  monitor: { viewBox: "688 320 2170 258", d: LOGO.monitor.napis },
  mobil: { viewBox: "245 199 665 292", d: LOGO.mobil.napis },
} as const;

// Vzor proužků potřebuje id unikátní na stránce, stejně jako původní logo.
let citac = 0;

function Napis({ verze }: { verze: keyof typeof NAPIS }) {
  const pruhy = `napis-pruhy-${++citac}`;
  return (
    <svg className={`logo logo-napis-oys logo-napis-${verze}`} viewBox={NAPIS[verze].viewBox} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={pruhy} patternUnits="userSpaceOnUse" width={LOGO.pruhy.perioda} height={LOGO.pruhy.perioda}>
          <rect className="logo-pruhy" width={LOGO.pruhy.perioda} height={LOGO.pruhy.tloustka} />
        </pattern>
      </defs>
      <path d={NAPIS[verze].d} fill={`url(#${pruhy})`} />
    </svg>
  );
}

export function Logo() {
  return (
    <>
      <Kresba className="logo logo-oys" />
      <Napis verze="monitor" />
      <Napis verze="mobil" />
    </>
  );
}

/**
 * Logo jako slabý rozostřený vodoznak na pozadí stránek. Průhlednost
 * a rozostření mu dává CSS.
 */
export function ZnakPozadi() {
  return <Kresba className="logo-oys pozadi-znak" />;
}
