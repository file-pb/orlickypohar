import Link from "@/app/sprava/odkaz";
import { notFound } from "next/navigation";
import { Vypadek } from "@/app/vypadek";
import { Drobecky, drobeckySpravy, drobekRegaty } from "@/app/drobecky";
import { nazevZastavky } from "@/lib/kalendar";
import { nactiJa } from "@/lib/ja";
import { prava, smi } from "@/lib/co-smim";
import { NadpisUkonu, PruhUkonuRegaty } from "@/app/sprava/pruh-ukonu";
import { datumClanku } from "@/app/datum";
import type { ZpravaRegaty } from "@/lib/api";
import {
  nactiKliceRegaty,
  nactiNastaveni,
  nactiOkna,
  nactiZpravySpravy,
  NAZVY_VIDENI,
  type CoVidiPosadky,
  type KliceLodi,
  type Nastaveni,
  type Okno,
} from "@/lib/tracker";
import { dataTrackeru, PanelTrackeru } from "./panel";
import {
  nastaveniAkce,
  odeberKlicAkce,
  rozpravaAkce,
  sledovaniAkce,
  stahniZpravuAkce,
  uzavriAkce,
  vydejZpravuAkce,
} from "./akce";

type Parametry = {
  params: Promise<{ serie: string; zavod: string }>;
  searchParams: Promise<{ chyba?: string; stav?: string }>;
};

// Odpověď závisí na tom, kdo se ptá, a mění se po vteřinách.
export const dynamic = "force-dynamic";

export const metadata = { title: "Tracker regaty — správa" };

/**
 * Tracker regaty pro pořadatele a rozhodčího — <b>celý závodní den na jedné
 * obrazovce</b>.
 *
 * <b>Tam, kde se podle polohy jedná, mapa je nutná</b> (Filip, 24. 10.
 * 2026). Text *„1,2 km jihozápadně"* odpoví na *„startujeme?"*, ale
 * neodpoví na *„je ještě na vodě, nebo už u břehu?"* — a to je otázka za
 * šera a ve zhoršeném počasí.
 *
 * <b>Tři věci kolem mapy, ne tři obrazovky</b> (25. 10. 2026): okno
 * závodního dne, co je z trackingu vidět, a telefony na palubě. Je to jeden
 * den a tři otázky téhož člověka — *jede se?*, *kdo to uvidí?*, *hlásí se
 * všichni?* — a chodit kvůli nim po obrazovkách by znamenalo odejít od mapy.
 * Do 25. 10. ty tři věci na webu nebyly vůbec: API je umělo, ale pořadatel
 * neměl odkud udělat rozpravu, takže se tracking nerozjel a ven nešlo nic
 * (oponentura, nález N6).
 *
 * <b>Táž mapa visí i pod výsledky</b> (`panel.tsx`), protože kdo zapisuje
 * cíl, je právě ten, koho zajímá, kdo je ještě na vodě.
 *
 * <b>Kdo na to nemá, dostane větu, ne prázdnou mapu</b> (Filip, 24. 10.
 * 2026). Ptá se na tutéž podmínku jako API (`PolohyEndpoints`): pořadatel
 * téhle regaty, nebo rozhodčí ročníku. Stav z `nactiTrat` by stačit nemohl —
 * trať smí číst i ten, kdo na polohy nemá.
 */
export default async function TrackerRegaty({ params, searchParams }: Parametry) {
  const { serie, zavod } = await params;
  const zpravy = await searchParams;

  const [nazev, { ja }] = await Promise.all([nazevZastavky(serie, zavod), nactiJa()]);

  const udelena = prava(ja);
  const smiVidet =
    smi(udelena, { role: "Organizator", serie, zavod }) ||
    smi(udelena, { role: "Rozhodci", serie });

  const hlava = (
    <>
      <Drobecky cesta={[...drobeckySpravy(serie), drobekRegaty(serie, zavod, nazev)]} />
      {/* Pruh se sám schová nepřihlášenému i tomu, kdo na regatě nemá úkon,
          takže smí stát i v hlavě, kterou vidí obě odmítnutí. */}
      <PruhUkonuRegaty serie={serie} zavod={zavod} aktivni="tracker" />
      <NadpisUkonu serie={serie} zavod={zavod} ukon="tracker" regata={nazev} />
    </>
  );

  if (!ja)
    return (
      <div className="tracker-strana">
        {hlava}
        <p className="prazdno">
          Na živé polohy lodí se musíš <Link href="/prihlaseni">přihlásit</Link>.
        </p>
      </div>
    );

  if (!smiVidet)
    return (
      <div className="tracker-strana">
        {hlava}
        <p className="prazdno">
          Živé polohy lodí vidí pořadatel téhle regaty nebo rozhodčí ročníku.
        </p>
      </div>
    );

  // Teprve za kontrolou. Čtyři volání, která by u neoprávněného stejně
  // skončila odmítnutím, nemá smysl posílat.
  const [data, okna, nastaveni, pole, vyveska] = await Promise.all([
    dataTrackeru(serie, zavod),
    nactiOkna(serie, zavod),
    nactiNastaveni(serie, zavod),
    nactiKliceRegaty(serie, zavod),
    nactiZpravySpravy(serie, zavod),
  ]);
  if (data.stav === "neni") notFound();

  return (
    <div className="tracker-strana">
      {hlava}

      {zpravy.chyba && (
        <p className="hlaska chyba" role="alert">
          {zpravy.chyba}
        </p>
      )}
      {zpravy.stav && !zpravy.chyba && (
        <p className="hlaska hotovo" role="status">
          {hotovo(zpravy.stav)}
        </p>
      )}

      {data.stav === "vypadek" ? (
        <Vypadek />
      ) : (
        <PanelTrackeru serie={serie} zavod={zavod} data={data} />
      )}

      <ZavodniDen serie={serie} zavod={zavod} okna={okna.data ?? []} />
      <Vyveska serie={serie} zavod={zavod} zpravy={vyveska.data} />
      <CoJeVidet serie={serie} zavod={zavod} nastaveni={nastaveni.data} />
      <TelefonyNaPalube serie={serie} zavod={zavod} pole={pole.data} />
    </div>
  );
}

/** Věta po zásahu. Skládá se tady, protože akce zná jen slugy. */
function hotovo(stav: string) {
  switch (stav) {
    case "otevreno":
      return "Rozprava zapsaná — od téhle chvíle telefony zaznamenávají.";
    case "zavreno":
      return "Závodní den uzavřený. Mezi dny se nesleduje.";
    case "nastaveno":
      return "Nastavení uloženo.";
    case "vydano":
      return "Zpráva visí na tabuli.";
    case "stazeno":
      return "Zpráva stažená. Z tabule zmizela, v historii zůstává.";
    case "odepnuto":
      return "Telefon je odepnutý. Posádka v lodi zůstává.";
    case "pripnuto":
      return "Telefon zase zaznamenává.";
    case "odebrano":
      return "Klíč odebraný. Telefon se bude muset spárovat znovu.";
    default:
      return "Hotovo.";
  }
}

/**
 * Okno závodního dne.
 *
 * <b>Rozprava je ten okamžik, od kterého se smí zaznamenávat</b> — dělá se
 * tak jako tak, jsou při ní všichni pohromadě a je dost dlouho před startem.
 * Bez ní server trasu nevezme a appka hlásí „čeká na rozpravu".
 */
function ZavodniDen({ serie, zavod, okna }: { serie: string; zavod: string; okna: Okno[] }) {
  const bezi = okna.find((o) => o.bezi);

  return (
    <section className="tracker-den">
      <h2>Závodní den</h2>

      {bezi ? (
        <>
          <p className="hlaska" role="status">
            <b>Zaznamenává se.</b> Den {bezi.den} běží od{" "}
            {new Date(bezi.otevrenoV).toLocaleTimeString("cs", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            , tvrdý konec {datumClanku(bezi.tvrdyKonec)}.
          </p>
          <form action={uzavriAkce} className="formular radkove">
            <input type="hidden" name="serie" value={serie} />
            <input type="hidden" name="zavod" value={zavod} />
            <button type="submit">Uzavřít závodní den</button>
            <span className="poznamka">
              Tím se přestane zaznamenávat. Doposlat už nahrané body jde i potom.
            </span>
          </form>
        </>
      ) : (
        <>
          <p className="prazdno">
            Zatím se nezaznamenává. <b>Rozprava otevře závodní den</b> — od ní smí telefony
            posílat trasu a zaklapne nastavení, co je z trackingu vidět.
          </p>
          <form action={rozpravaAkce} className="formular radkove">
            <input type="hidden" name="serie" value={serie} />
            <input type="hidden" name="zavod" value={zavod} />
            <label>
              Potrvá hodin
              <input
                name="trvaniHodin"
                type="number"
                min={1}
                max={36}
                inputMode="numeric"
                placeholder="14"
              />
            </label>
            <button type="submit">Rozprava — otevřít den</button>
          </form>
          <p className="poznamka">
            Bez vyplnění je to 14 hodin, nejvíc 36. Je to tvrdý konec, který platí, i když den
            nikdo neuzavře — dvacetičtyřhodinovka si o delší řekne při rozpravě.
          </p>
        </>
      )}

      {okna.length > 0 && (
        <ul className="seznam tenky">
          {okna.map((o) => (
            <li key={o.id}>
              Den {o.den}: {datumClanku(o.otevrenoV)}
              {o.zavrenoV ? ` — uzavřeno ${datumClanku(o.zavrenoV)}` : o.bezi ? " — běží" : " — vypršelo"}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Co je z trackingu vidět.
 *
 * <b>Tři přepínače, ne matice režimů</b>: míchaly se dvě různé otázky —
 * *kdy* se smí dívat a *koho* je vidět. <b>Zamyká rozprava, ne start</b>:
 * mezi rozpravou a startem už polohy chodí, a to je přesně okno, ve kterém
 * by šlo nastavení překlopit podle toho, co je na mapě.
 */
function CoJeVidet({
  serie,
  zavod,
  nastaveni,
}: {
  serie: string;
  zavod: string;
  nastaveni?: Nastaveni;
}) {
  if (!nastaveni)
    return (
      <section className="tracker-videni">
        <h2>Co je vidět</h2>
        <p className="prazdno">Nastavení se teď nedaří načíst.</p>
      </section>
    );

  const volby: CoVidiPosadky[] = ["Nic", "JenSebe", "IOstatni"];

  return (
    <section className="tracker-videni">
      <h2>Co je vidět</h2>

      {nastaveni.zamceno ? (
        <p className="hlaska" role="status">
          <b>Zamčeno rozpravou</b> {nastaveni.zamcenoV && `(${datumClanku(nastaveni.zamcenoV)})`}.
          Teď smí zasáhnout už jen rozhodčí a jen zpřísnit — a s důvodem, protože zamčené
          nastavení je zároveň doklad ke sporu „vy jste nás viděli a my vás ne".
        </p>
      ) : (
        <p className="poznamka">
          Nastav to <b>před rozpravou</b>: tou to zaklapne, a zamrzne i to, co nikdo nenastavil.
          Výchozí hodnota je bezpečná — posádky jen sebe, ven nic.
        </p>
      )}

      <form action={nastaveniAkce} className="formular">
        <input type="hidden" name="serie" value={serie} />
        <input type="hidden" name="zavod" value={zavod} />

        <label>
          Posádky na vodě vidí
          <select name="coVidiPosadky" defaultValue={nastaveni.coVidiPosadky}>
            {volby.map((v) => (
              <option key={v} value={v}>
                {NAZVY_VIDENI[v]}
              </option>
            ))}
          </select>
        </label>

        <label className="zaskrtnuti">
          <input
            type="checkbox"
            name="zivyPrenosVen"
            value="ano"
            defaultChecked={nastaveni.zivyPrenosVen}
          />{" "}
          živý přenos ven — na web i na tabuli
        </label>
        <p className="poznamka">
          Vysílá se jen <b>za jízdy</b>: mimo rozjížďku se vydávání vypíná, protože kde se kdo
          mezi rozjížďkami koupal, do přenosu nepatří.
        </p>

        <label className="zaskrtnuti">
          <input
            type="checkbox"
            name="jizdyPoRegateVerejne"
            value="ano"
            defaultChecked={nastaveni.jizdyPoRegateVerejne}
          />{" "}
          jízdy po regatě veřejně
        </label>
        <p className="poznamka">
          Tenhle se nezamyká: rozhoduje se o něm až po závodě a na jeho průběh nemá vliv.
        </p>

        {nastaveni.zamceno && (
          <label>
            Proč to měníš
            <input name="duvod" maxLength={200} placeholder="Posádky to řešily za jízdy." />
          </label>
        )}

        <button type="submit">Uložit</button>
      </form>
    </section>
  );
}

/**
 * Telefony na palubě.
 *
 * <b>Pořadatel je ten, kdo past „telefon, který zůstal v autě" vidí z vody</b>
 * (Filip, 25. 10. 2026). Loď bez jediného klíče je tu schválně: otázka před
 * procedurou zní *„má celé pole zapnutý tracker?"*, a na tu loď chybějící ve
 * výpisu neodpovídá.
 */
function TelefonyNaPalube({
  serie,
  zavod,
  pole,
}: {
  serie: string;
  zavod: string;
  pole?: KliceLodi[];
}) {
  if (!pole)
    return (
      <section className="tracker-telefony">
        <h2>Telefony na palubě</h2>
        <p className="prazdno">Spárované telefony se teď nedaří načíst.</p>
      </section>
    );

  const zive = (l: KliceLodi) => l.klice.filter((k) => !k.odebran);
  const bez = pole.filter((l) => zive(l).length === 0);
  const sKlicem = pole.filter((l) => zive(l).length > 0);

  return (
    <section className="tracker-telefony">
      <h2>Telefony na palubě</h2>
      <p className="poznamka">
        {sKlicem.length} z {pole.length}{" "}
        {pole.length === 1 ? "lodi má" : "lodí má"} spárovaný aspoň jeden telefon.
      </p>

      {sKlicem.length > 0 && (
        <ul className="seznam">
          {sKlicem.map((l) => (
            <li key={l.lodId}>
              <strong>{l.lod}</strong>
              {l.cisloPlachty && <span className="detail"> {l.cisloPlachty}</span>}
              <ul className="seznam tenky">
                {zive(l).map((k) => (
                  <li key={k.id}>
                    {k.jmeno ?? `Telefon #${k.id}`}
                    {!k.sleduje && <span className="stitek">nesleduje se</span>}
                    <span className="detail">
                      {" "}
                      {k.posledniPouzitiV
                        ? `naposled se ozval ${datumClanku(k.posledniPouzitiV)}`
                        : "zatím se neozval"}
                    </span>
                    <form action={sledovaniAkce} className="radkove">
                      <input type="hidden" name="serie" value={serie} />
                      <input type="hidden" name="zavod" value={zavod} />
                      <input type="hidden" name="klic" value={k.id} />
                      <input type="hidden" name="sleduje" value={k.sleduje ? "ne" : "ano"} />
                      <button type="submit">
                        {k.sleduje ? "Odepnout ze sledování" : "Připnout zpátky"}
                      </button>
                    </form>
                    {/* Odebrání je krok zpátky, ne rovnocenná volba — a je
                        nevratné: co telefon nestihl poslat, už nepošle. */}
                    <details className="odebrat-klic">
                      <summary>Odebrat natrvalo</summary>
                      <form action={odeberKlicAkce} className="formular radkove">
                        <input type="hidden" name="serie" value={serie} />
                        <input type="hidden" name="zavod" value={zavod} />
                        <input type="hidden" name="klic" value={k.id} />
                        <button type="submit">Opravdu odebrat</button>
                        <span className="poznamka">
                          Klíč zanikne a nedá se oživit. <b>Co telefon nestihl odeslat, už
                          neodešle</b> — na odepnutí to neplatí, to je vratné.
                        </span>
                      </form>
                    </details>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {bez.length > 0 && (
        <p className="prazdno">
          <b>Bez spárovaného telefonu:</b> {bez.map((l) => l.lod).join(", ")}. Klíč vydává
          kapitán nebo posádka na obrazovce <Link href="/moje-lode">Moje lodě</Link>, nebo
          v appce.
        </p>
      )}
    </section>
  );
}

/**
 * Vývěska regaty: krátké zprávy, které během dne vidí tabule v hospodě.
 *
 * <b>Píše se to za chodu, často na vodě</b>, takže formulář nic nevymýšlí
 * — text, druh a volitelná lhůta. Delší text by se na televizi stejně
 * nepřečetl, proto má strop.
 *
 * <b>Zpráva se nemaže, stahuje</b> (jako směrnice): co bylo vyvěšeno, má
 * jít doložit. Z tabule zmizí hned, ze seznamu ne — jen zešedne.
 */
function Vyveska({
  serie,
  zavod,
  zpravy,
}: {
  serie: string;
  zavod: string;
  zpravy?: ZpravaRegaty[];
}) {
  if (!zpravy)
    return (
      <section className="tracker-vyveska">
        <h2>Vývěska regaty</h2>
        <p className="prazdno">Zprávy se teď nedaří načíst.</p>
      </section>
    );

  const plati = zpravy.filter((z) => !z.stazenoV && (!z.platiDo || Date.parse(z.platiDo) > Date.now()));
  const pryc = zpravy.filter((z) => !plati.includes(z));

  return (
    <section className="tracker-vyveska">
      <h2>Vývěska regaty</h2>
      <p className="poznamka">
        Co sem napíšeš, <b>uvidí tabule v hospodě</b> — kdy je rozprava, že se start
        odkládá, že se čeká na bouřku. Zpráva se nemaže, jen stahuje: co bylo vyvěšeno,
        má jít doložit.
      </p>

      <form action={vydejZpravuAkce} className="formular">
        <input type="hidden" name="serie" value={serie} />
        <input type="hidden" name="zavod" value={zavod} />
        <label>
          Zpráva
          <input
            name="text"
            maxLength={400}
            required
            placeholder="Start první rozjížďky se odkládá o 45 minut."
          />
        </label>
        <div className="radkove">
          <label>
            Druh
            <select name="druh" defaultValue="Informace">
              <option value="Informace">oznámení</option>
              <option value="Program">změna programu</option>
              <option value="Vystraha">výstraha</option>
            </select>
          </label>
          <label>
            Platí hodin
            <input name="platiHodin" type="number" min={1} max={72} inputMode="numeric" placeholder="bez lhůty" />
          </label>
          <button type="submit">Vyvěsit</button>
        </div>
        <p className="poznamka">
          Bez lhůty visí, dokud ji nestáhneš. Lhůta je pojistka proti zapomenuté
          vývěsce — „rozprava v 9:00“ nemá na tabuli viset večer.
        </p>
      </form>

      {plati.length > 0 && (
        <ul className="seznam">
          {plati.map((z) => (
            /* <b>Dikce zprávy je vidět, ne jen napsaná</b> (27. 10. 2026).
               Druh se zadával a ukládal, ale ve správě se neprojevoval
               nijak: „start se odkládá o tři čtvrtě hodiny" vypadalo
               stejně jako „čeká se, až přejde bouřka". Třída na řádku
               nese pruh u levé hrany, štítek k tomu barvu a výplň —
               a vlastní slovo zůstává, protože barva sama nestačí. */
            <li key={z.id} className={`zprava-${z.druh.toLowerCase()}`}>
              <span className={`stitek zprava-${z.druh.toLowerCase()}`}>{NAZVY_ZPRAV[z.druh]}</span>{" "}
              {z.text}
              <span className="detail">
                {" "}
                vyvěšeno {datumClanku(z.vydanoV)}
                {z.platiDo && ` · platí do ${datumClanku(z.platiDo)}`}
              </span>
              <form action={stahniZpravuAkce} className="radkove">
                <input type="hidden" name="serie" value={serie} />
                <input type="hidden" name="zavod" value={zavod} />
                <input type="hidden" name="id" value={z.id} />
                <button type="submit" className="tlacitko-tenke">
                  Stáhnout
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {pryc.length > 0 && (
        <>
          <h3>Co už neplatí</h3>
          <ul className="seznam tenky">
            {pryc.map((z) => (
              <li key={z.id} className="stazena">
                {z.text}
                <span className="detail">
                  {" "}
                  {z.stazenoV ? `staženo ${datumClanku(z.stazenoV)}` : "lhůta vypršela"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** Jak se druhům zpráv říká v češtině. */
const NAZVY_ZPRAV: Record<ZpravaRegaty["druh"], string> = {
  Informace: "oznámení",
  Program: "program",
  Vystraha: "výstraha",
};
