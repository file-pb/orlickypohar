import { DUVOD_NEJVIC, type Trat } from "@/lib/trat";
import { stavTratiAkce } from "./akce";

/**
 * Stav trati nad bójemi.
 *
 * <b>Stojí nahoře schválně</b>: rozhoduje o tom, jestli se vůbec smí pípat.
 * Kdyby byl pod seznamem, člověk by se o zámku dozvěděl až z chyby, kterou
 * mu vrátí API — a na vodě je to o dvě klepnutí a jednu nadávku navíc.
 *
 * <b>Co kdo smí, přichází ze serveru</b> (`smi*`), tady se podle toho jen
 * skrývají tlačítka. Kdo formulář pošle přesto, dostane odpověď z API.
 */
export function StavTrati({
  serie,
  zavod,
  trat,
}: {
  serie: string;
  zavod: string;
  trat: Trat;
}) {
  const stav = POPIS[trat.stav];

  return (
    <section className="stav-trati" aria-labelledby="stav-trati-nadpis">
      <h2 id="stav-trati-nadpis">Stav trati</h2>

      <p className={`stitek stav-${trat.stav.toLowerCase()}`}>{stav.stitek}</p>
      <p>{stav.co}</p>

      {trat.prijal && trat.prijatoV && (
        <p className="poznamka">
          Přijal {trat.prijal} {kdy(trat.prijatoV)}.
        </p>
      )}

      {trat.duvodVraceni && (
        <p className="hlaska" role="status">
          <b>Rozhodčí vrátil stavitelům:</b> {trat.duvodVraceni}
        </p>
      )}

      {trat.nahrazujeId && (
        <p className="poznamka">
          Navazuje na předchozí trať téhle regaty — ta zůstala přijatá, protože
          se podle ní jelo.
        </p>
      )}

      {trat.odjeta && (
        <p className="poznamka">
          <b>Podle téhle trati už rozjížďka jela.</b> Přestavba ji nepřepíše:
          založí novou a tahle zůstane, aby šlo doložit, kde bóje stály.
        </p>
      )}

      <div className="tlacitka">
        {trat.smiHlasitHotovo && (
          <Krok serie={serie} zavod={zavod} trat={trat.id} krok="hotovo" popis="Hlásit hotovo" />
        )}
        {trat.smiPrijmout && (
          <Krok serie={serie} zavod={zavod} trat={trat.id} krok="prijeti" popis="Přijmout trať" />
        )}
        {trat.smiPrestavet && (
          <Krok serie={serie} zavod={zavod} trat={trat.id} krok="prestavba" popis="Odemknout na přestavbu" />
        )}
      </div>

      {/* Vrácení má vlastní formulář kvůli důvodu. Bez něj je vrácení jen
          „ne" a stavitelé nevědí, co dodělat. */}
      {trat.stav === "Hotovo" && (
        <form action={stavTratiAkce} className="formular">
          <input type="hidden" name="serie" value={serie} />
          <input type="hidden" name="zavod" value={zavod} />
          <input type="hidden" name="krok" value="vraceni" />
          <input type="hidden" name="trat" value={trat.id} />
          <label>
            Vrátit stavitelům — co chybí
            <input name="duvod" maxLength={DUVOD_NEJVIC} placeholder="chybí cílová bóje" />
            <span className="poznamka">Vidí to ten, kdo trať staví.</span>
          </label>
          <button type="submit">Vrátit stavitelům</button>
        </form>
      )}
    </section>
  );
}

function Krok({
  serie,
  zavod,
  trat,
  krok,
  popis,
}: {
  serie: string;
  zavod: string;
  /** Které trati se krok týká — bez toho sáhne server na nejnovější. */
  trat: number;
  krok: string;
  popis: string;
}) {
  return (
    <form action={stavTratiAkce}>
      <input type="hidden" name="serie" value={serie} />
      <input type="hidden" name="zavod" value={zavod} />
      <input type="hidden" name="krok" value={krok} />
      <input type="hidden" name="trat" value={trat} />
      <button type="submit">{popis}</button>
    </form>
  );
}

/**
 * Co stav znamená, řečeno pořadateli. Ne názvem z databáze — ten mu
 * neřekne, jestli trať někdo vidí.
 */
const POPIS: Record<string, { stitek: string; co: string }> = {
  Rozestaveno: {
    stitek: "Staví se",
    co: "Veřejně ji zatím nikdo nevidí. Až bude stát, nahlas hotovo a rozhodčí ji přijme.",
  },
  Hotovo: {
    stitek: "Čeká na rozhodčího",
    co: "Stavitelé hlásí, že trať stojí. Veřejná bude, až ji rozhodčí přijme.",
  },
  Prijato: {
    stitek: "Přijatá a zamčená",
    co:
      "Trať je veřejná — závodníci si ji můžou stáhnout. Pípnout ani sebrat bóji "
      + "proto nejde; na úpravu ji nejdřív odemkni přestavbou.",
  },
  Prestavba: {
    stitek: "Přestavuje se",
    co:
      "Veřejně je vidět, že se trať přestavuje — stará se už neukazuje, aby podle ní "
      + "nikdo neplul. Až bude stát, nahlas hotovo.",
  },
};

/** Den a čas tak, jak je to na obrazovce dost přesné. */
function kdy(iso: string) {
  return new Date(iso).toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
