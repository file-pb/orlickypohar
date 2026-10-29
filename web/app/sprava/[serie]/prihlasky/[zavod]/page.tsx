import Link from "@/app/sprava/odkaz";
import { notFound } from "next/navigation";
import { Drobecky, drobeckySpravy, drobekRegaty } from "@/app/drobecky";
import { NadpisUkonu, PruhUkonuRegaty } from "@/app/sprava/pruh-ukonu";
import { Lodka } from "@/app/lodka";
import { Stav } from "@/app/stav";
import { Vypadek } from "@/app/vypadek";
import {
  NOVA,
  STAVY_UCASTI,
  potrebujeDuvod,
  skupinaStavu,
  nactiPrihlasky,
  type LodNaZastavce,
  type StavUcasti,
} from "@/lib/prihlasky";
import QRCode from "qrcode";
import { adresaKodu } from "@/lib/pripojeni";
import {
  novaLodAkce,
  prihlasAkce,
  smazAkce,
  startovneAkce,
  stavLodiAkce,
  vystavKodAkce,
} from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Přihlášené lodě — správa" };

type Parametry = {
  params: Promise<{ serie: string; zavod: string }>;
  searchParams: Promise<{
    chyba?: string;
    /**
     * U které přihlášky se server ptá na potvrzení: id přihlášky, nebo
     * <c>nova</c> u lodi, která v ročníku ještě není a id tedy nemá.
     */
    potvrdit?: string;
    /** Souhlas zaškrtnutý před otázkou na pozdní přihlášku — nese se dál. */
    souhlas?: string;
    stav?: string;
    lod?: string;
    nastav?: StavUcasti;
    nova?: string;
    nazev?: string;
    kategorie?: string;
    jmeno?: string;
    prijmeni?: string;
    cisloPlachty?: string;
    typ?: string;
    kod?: string;
    kodLod?: string;
    doKdy?: string;
  }>;
};

/**
 * Přihlášky lodí na jednu regatu: kdo se chystá jet.
 *
 * <b>Přihlašuje pořadatel</b>, loď sama ne (Filip, 14. 9. 2026). Celé
 * serverové a bez javascriptu jako zbytek administrace. Co s lodí jde
 * udělat, posílá API v každém řádku.
 */
export default async function PrihlaskyZastavky({ params, searchParams }: Parametry) {
  const { serie, zavod } = await params;
  const zpravy = await searchParams;

  const { stav, data: prehled } = await nactiPrihlasky(serie, zavod);

  // QR se kreslí na serveru do SVG — administrace zůstává bez javascriptu.
  const vystaveny = zpravy.kod
    ? {
        kod: zpravy.kod,
        lod: zpravy.kodLod,
        doKdy: zpravy.doKdy,
        // QR se kreslí na serveru do SVG — administrace zůstává bez javascriptu.
        qr: await QRCode.toString(adresaKodu(zpravy.kod), { type: "svg", margin: 1 }),
      }
    : undefined;

  // Výpadek nesmí spolknout výsledek zápisu.
  if (stav === "vypadek")
    return (
      <>
        {zpravy.chyba && (
          <p className="hlaska chyba" role="alert">
            {zpravy.chyba}
          </p>
        )}
        <Vypadek />
      </>
    );

  if (stav === "neni") notFound();

  const hlava = (
    <>
      <Drobecky
        cesta={drobeckySpravy(serie, [
          drobekRegaty(serie, zavod),
          { text: "Přihlášky" },
        ])}
      />
      <h1>Přihlášené lodě</h1>
    </>
  );

  if (stav === "neprihlasen")
    return (
      <>
        {hlava}
        <p className="prazdno">
          Na správu přihlášek se musíš <Link href="/prihlaseni">přihlásit</Link>.
        </p>
      </>
    );

  if (stav === "odmitnut")
    return (
      <>
        {hlava}
        <p className="prazdno">
          Přihlášení vypršelo. <Link href="/prihlaseni">Přihlas se znovu</Link>.
        </p>
      </>
    );

  if (stav === "nesmi" || !prehled)
    return (
      <>
        {hlava}
        <p className="prazdno">
          K přihláškám téhle regaty nemáš přístup. Spravuje je její pořadatel.
          Co smíš ty, ukáže <Link href={`/sprava/${serie}`}>rozcestník ročníku</Link>;
          co která role smí, je v <Link href="/napoveda#role">nápovědě</Link>.
        </p>
      </>
    );

  // Požadavky z webu nahoře: čekají na pořadatele a nemají se ztratit
  // mezi zapsanými.
  const cekaji = prehled.lode.filter((l) => l.stav && skupinaStavu(l.stav) === "ceka");
  const prihlasene = prehled.lode.filter((l) => l.stav && skupinaStavu(l.stav) === "jede");
  // Jen z lodí, které na regatě jedou: u čekající přihlášky souhlas ještě
  // chybět smí, protože se teprve vyřizuje.
  const bezSouhlasu = prihlasene.filter((l) => !l.souhlasV);
  const zrusene = prehled.lode.filter((l) => l.stav && skupinaStavu(l.stav) === "mimo");
  const volne = prehled.lode.filter((l) => !l.stav);

  return (
    <>
      <Drobecky
        cesta={drobeckySpravy(serie, [
          drobekRegaty(serie, zavod, prehled.zavodNazev),
          { text: "Přihlášky" },
        ])}
      />
      <PruhUkonuRegaty serie={serie} zavod={zavod} aktivni="prihlasky" />
      {/* „Přihlášené lodě" odešlo z podtitulku do nadpisu a stav se posunul
          za něj — samotný štítek na vlastním řádku vypadal jako zbytek. */}
      <NadpisUkonu serie={serie} zavod={zavod} ukon="prihlasky" regata={prehled.zavodNazev}>
        <Stav stav={prehled.stavZavodu} />
      </NadpisUkonu>

      {zpravy.chyba && (
        <p className="hlaska chyba" role="alert">
          {zpravy.chyba}
        </p>
      )}
      {/* <b>Server se ptá, obrazovka nabídne odpověď</b>. Bez tohohle by
          hláška o vyhlášených výsledcích pozdní přihlášku zablokovala
          úplně — a to je legitimní cesta: loď se domluví telefonem na
          startu a zapíše se dodatečně. */}
      {zpravy.potvrdit &&
        (zpravy.potvrdit === NOVA ? (
          // Nová loď id nemá, takže se celé zadání posílá znovu z adresy —
          // odtud se předplní i formulář níž. Jedno klepnutí, ne „vyplň to
          // ještě jednou": loď u startu čeká.
          <form action={novaLodAkce} className="formular radkove">
            <input type="hidden" name="serie" value={serie} />
            <input type="hidden" name="zavod" value={zavod} />
            <input type="hidden" name="nazev" value={zpravy.nazev ?? ""} />
            <input type="hidden" name="kategorie" value={zpravy.kategorie ?? ""} />
            <input type="hidden" name="jmeno" value={zpravy.jmeno ?? ""} />
            <input type="hidden" name="prijmeni" value={zpravy.prijmeni ?? ""} />
            <input type="hidden" name="cisloPlachty" value={zpravy.cisloPlachty ?? ""} />
            <input type="hidden" name="typ" value={zpravy.typ ?? ""} />
            <input type="hidden" name="potvrzeno" value="ano" />
            {/* Souhlas zaškrtnutý v prvním pokusu se nesmí ztratit cestou
                přes otázku (nález R9, 28. 10. 2026). */}
            {zpravy.souhlas === "ano" && (
              <input type="hidden" name="souhlas" value="ano" />
            )}
            <button type="submit">Založit a přihlásit i tak</button>
          </form>
        ) : (
          <form action={prihlasAkce} className="formular radkove">
            <input type="hidden" name="serie" value={serie} />
            <input type="hidden" name="zavod" value={zavod} />
            <input type="hidden" name="prihlaskaId" value={zpravy.potvrdit} />
            <input type="hidden" name="potvrzeno" value="ano" />
            {zpravy.souhlas === "ano" && (
              <input type="hidden" name="souhlas" value="ano" />
            )}
            <button type="submit">Přihlásit i tak</button>
          </form>
        ))}
      {zpravy.stav && !zpravy.chyba && (
        <p className="hlaska hotovo" role="status">
          {hotovo(zpravy.stav, zpravy.lod, zpravy.nastav)}
        </p>
      )}
      {/* Hláška chodí z API (`Prihlasky.ProcNelze`), takže odkaz nemůže být
          v ní — stojí vedle. Nejčastější důvod je stav regaty, a ten se
          mění v kalendáři. */}
      {prehled.procNelze && (
        <p className="hlaska" role="status">
          {prehled.procNelze}{" "}
          <Link href={`/sprava/${serie}/kalendar`}>Kalendář ročníku</Link> ·{" "}
          <Link href="/napoveda#vypsat-regatu">jak se regata vypisuje</Link>
        </p>
      )}

      <p className="poznamka">
        {pocet(prihlasene.length)}, z toho{" "}
        {prihlasene.filter((l) => l.stav === "Potvrzena").length} potvrzených.{" "}
        <Link href={`/sprava/${serie}/vysledky/${zavod}`}>Výsledky regaty →</Link>
      </p>

      {/* <b>Které lodě nemají souhlas s pravidly</b> (nález R9 oponentury
          rozhodčího, 28. 10. 2026). U poháru, který pořadatelsky ofiko
          není, je souhlas jediná vazba závodníka na pravidla — a loď
          zapsaná pořadatelem nebo navezená importem ho nemá žádnou,
          protože se u těch cest nevynucuje (zapsat loď domluvenou
          telefonem na startu musí jít i tak).
          <b>Prázdno je tedy informace, ne chybějící údaj</b>, a rozhodčí
          ji má vidět na jednom místě, ne po lodích. Je to tatáž otázka
          jako u telefonů v bodu 11 návodu — *„hlásí se celé pole?"* — jen
          o patro níž, a sedí na ni tentýž vzorec: vypsat dole ty, u kterých
          něco chybí. */}
      {bezSouhlasu.length > 0 && (
        <p className="poznamka">
          <b>
            Bez souhlasu s pravidly: {bezSouhlasu.length} z {prihlasene.length}
          </b>{" "}
          — {bezSouhlasu.map((l) => l.lod).join(", ")}
          {". "}
          Souhlas dává kapitán ve veřejné přihlášce; u lodí zapsaných
          pořadatelem nebo navezených importem se nevynucuje a zaznamenat ho
          jde při přihlášení.
        </p>
      )}

      {cekaji.length > 0 && (
        <>
          <h2>Čekají na vyřízení</h2>
          <p className="poznamka" style={{ marginTop: 0 }}>
            Přihlášky z webu a vrácené k doplnění. Na webu nejsou, dokud je
            nezapíšeš —{" "}
            <Link href={`/serie/${serie}/zavody/${zavod}`}>co je venku</Link>.
          </p>
          <Tabulka serie={serie} zavod={zavod} lode={cekaji} kategorie={prehled.kategorie} kod={vystaveny} />
        </>
      )}

      {prihlasene.length === 0 ? (
        <p className="prazdno">
          Na regatu zatím není přihlášená žádná loď. Přihlas ji formulářem níž,
          nebo pošli posádkám{" "}
          <Link href={`/serie/${serie}/zavody/${zavod}/prihlaska`}>
            odkaz na veřejnou přihlášku
          </Link>.
        </p>
      ) : (
        <Tabulka
          serie={serie}
          zavod={zavod}
          lode={prihlasene}
          kategorie={prehled.kategorie}
          kod={vystaveny}
        />
      )}

      {prehled.smiSpravovat && (
        <>
          <h2>Přihlásit loď</h2>

          {volne.length > 0 && (
            <form action={prihlasAkce} className="formular">
              <input type="hidden" name="serie" value={serie} />
              <input type="hidden" name="zavod" value={zavod} />
              <label>
                Loď z ročníku
                <select name="prihlaskaId" required defaultValue="">
                  <option value="" disabled>
                    Vyber loď
                  </option>
                  {prehled.kategorie.map((k) => {
                    const vKategorii = volne.filter((l) => l.kategorie === k);
                    return (
                      vKategorii.length > 0 && (
                        <optgroup key={k} label={k}>
                          {vKategorii.map((l) => (
                            <option key={l.prihlaskaId} value={l.prihlaskaId}>
                              {l.lod}
                              {l.cisloPlachty ? ` · ${l.cisloPlachty}` : ""} · {l.majitel}
                            </option>
                          ))}
                        </optgroup>
                      )
                    );
                  })}
                </select>
              </label>
              {/* <b>Souhlas s pravidly, který kapitán dal mimo web</b>
                  (nález R9 oponentury rozhodčího, 28. 10. 2026). Veřejný
                  formulář bez souhlasu neprojde, protože tam ho dává
                  kapitán sám; tady ho pořadatel jen zaznamenává za něj,
                  takže se <b>nevynucuje</b> — loď domluvená telefonem na
                  startu se zapsat musí i bez něj, a prázdno je pravda,
                  kdežto dosazený souhlas by byl doklad o něčem, co se
                  nestalo. Jednou daný se už nemaže. */}
              <label>
                <input type="checkbox" name="souhlas" value="ano" /> Kapitán mi
                potvrdil souhlas s pravidly závodu a s účastí na vlastní nebezpečí
              </label>
              <button type="submit">Přihlásit</button>
            </form>
          )}

          {/* Nová loď se rozbaluje, protože je výjimka: většina lodí v ročníku
              už je a hledá se v nabídce nad tím. Po chybě zůstává otevřená. */}
          <details className="uprava-samostatna" open={zpravy.nova === "1"}>
            <summary>Nová loď, která v ročníku ještě není</summary>
            <form action={novaLodAkce} className="formular">
              <input type="hidden" name="serie" value={serie} />
              <input type="hidden" name="zavod" value={zavod} />
              <label>
                Název lodi
                <input name="nazev" required maxLength={120} defaultValue={zpravy.nazev} />
              </label>
              <label>
                Kategorie
                <select name="kategorie" required defaultValue={zpravy.kategorie ?? ""}>
                  <option value="" disabled>
                    Vyber kategorii
                  </option>
                  {prehled.kategorie.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Číslo plachty
                <input
                  name="cisloPlachty"
                  maxLength={20}
                  placeholder="CZE 430"
                  defaultValue={zpravy.cisloPlachty}
                />
              </label>
              <label>
                Typ lodi
                <input name="typ" maxLength={80} placeholder="Pirát" defaultValue={zpravy.typ} />
              </label>
              <label>
                Jméno majitele
                <input name="jmeno" required maxLength={80} defaultValue={zpravy.jmeno} />
              </label>
              <label>
                Příjmení majitele
                <input name="prijmeni" required maxLength={80} defaultValue={zpravy.prijmeni} />
              </label>
              {/* <b>Souhlas s pravidly, který kapitán dal mimo web</b>
                  (nález R9 oponentury rozhodčího, 28. 10. 2026). Veřejný
                  formulář bez souhlasu neprojde, protože tam ho dává
                  kapitán sám; tady ho pořadatel jen zaznamenává za něj,
                  takže se <b>nevynucuje</b> — loď domluvená telefonem na
                  startu se zapsat musí i bez něj, a prázdno je pravda,
                  kdežto dosazený souhlas by byl doklad o něčem, co se
                  nestalo. Jednou daný se už nemaže. */}
              <label>
                <input type="checkbox" name="souhlas" value="ano" /> Kapitán mi
                potvrdil souhlas s pravidly závodu a s účastí na vlastní nebezpečí
              </label>
              <button type="submit">Založit a přihlásit</button>
              <p className="poznamka">
                Loď se tím stává účastníkem celého ročníku v kategorii, kterou
                vybereš. Za regaty, na kterých nebyla, dostane v průběžném
                pořadí tolik bodů, kolik lodí její kategorie bylo na tu regatu
                přihlášeno — i těch, které se nakonec nedostavily. Celé
                bodování je v <Link href="/pravidla">pravidlech</Link>.
              </p>
            </form>
          </details>
        </>
      )}

      {zrusene.length > 0 && (
        <>
          <h2>Mimo závod</h2>
          <p className="poznamka">
            Odhlášené, odmítnuté a nedostavené. Na webu nejsou. Vrátit je jde, dokud přihlášky běží.
          </p>
          <Tabulka serie={serie} zavod={zavod} lode={zrusene} kategorie={prehled.kategorie} kod={vystaveny} />
        </>
      )}
    </>
  );
}

/** Lodě po kategoriích, v pořadí ročníku. Každý řádek nese, co s ním jde. */
function Tabulka({
  serie,
  zavod,
  lode,
  kategorie,
  kod,
}: {
  serie: string;
  zavod: string;
  lode: LodNaZastavce[];
  kategorie: string[];
  /** Zrovna vystavený kód: u které lodi, dokdy platí a jeho QR. */
  kod?: { kod: string; lod?: string; doKdy?: string; qr: string | null };
}) {
  return (
    <div className="tabulka-obal">
      <table>
        <thead>
          <tr>
            <th className="lod">Loď</th>
            <th className="vlevo">Stav</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {kategorie.flatMap((k) => {
            const vKategorii = lode.filter((l) => l.kategorie === k);
            if (vKategorii.length === 0) return [];

            return [
              <tr key={`k-${k}`} className="kategorie">
                <td colSpan={3}>{k}</td>
              </tr>,
              ...vKategorii.map((l) => (
                <tr key={l.prihlaskaId}>
                  <td className="lod">
                    <Lodka kategorie={l.kategorie} stav={l.stav} />
                    {l.lod}
                    <div className="majitel">
                      {[l.cisloPlachty, l.typLodi, l.majitel].filter(Boolean).join(" · ")}
                    </div>
                    {l.stav && <Podrobnosti serie={serie} zavod={zavod} lod={l} />}
                    {/* Připojovací kód rovnou od stolu registrace: kapitán
                        ho opíše nebo načte QR a loď má v appce (Filip,
                        4. 10. 2026). */}
                    {kod && kod.lod === String(l.lodId) ? (
                      <Kod kod={kod.kod} doKdy={kod.doKdy} qr={kod.qr} />
                    ) : (
                      <form action={vystavKodAkce} className="radkove">
                        <input type="hidden" name="serie" value={serie} />
                        <input type="hidden" name="zavod" value={zavod} />
                        <input type="hidden" name="lod" value={l.lodId} />
                        <button type="submit" className="jemne">
                          Vystavit kód k připojení
                        </button>
                      </form>
                    )}
                  </td>
                  <td className="vlevo">
                    {l.stav && (
                      <span className={`stitek ucast-${l.stav.toLowerCase()}`}>
                        {STAVY_UCASTI[l.stav].stitek}
                      </span>
                    )}
                    {l.maVysledky && <span className="stitek">má výsledky</span>}
                    {l.duvod && <div className="poznamka" style={{ margin: "0.25rem 0 0" }}>{l.duvod}</div>}
                  </td>
                  <td>
                    <div className="stavy">
                      {/* Dokument popisuje stav včetně null, protože u lodi
                          mimo regatu chybí; v nabídce ale prázdný není. */}
                      {l.mozneStavy
                        .filter((na): na is StavUcasti => na != null && !potrebujeDuvod(na))
                        .map((na) => (
                          <form key={na} action={stavLodiAkce}>
                            <Skryte serie={serie} zavod={zavod} lod={l} />
                            <input type="hidden" name="stav" value={na} />
                            {/* `aria-label` začíná viditelným textem
                                schválně: samotný `title` ho přebije, takže
                                čtečka i hlasové ovládání znaly tlačítko jako
                                dlouhou větu a „klikni na Zapsat" nefungovalo
                                (WCAG 2.5.3). */}
                            <button
                              type="submit"
                              title={STAVY_UCASTI[na].popis}
                              aria-label={`${tlacitko(l.stav, na)} — ${STAVY_UCASTI[na].popis}`}
                            >
                              {tlacitko(l.stav, na)}
                            </button>
                          </form>
                        ))}
                      {/* Vrácení, odmítnutí a vyloučení chtějí důvod — kapitán
                          se jinak nedozví, co má doplnit. Pole se rozbalí až
                          na kliknutí, aby tabulka nebyla plná prázdných políček. */}
                      {l.mozneStavy
                        .filter((na): na is StavUcasti => na != null && potrebujeDuvod(na))
                        .map((na) => (
                          <details key={na} className="s-duvodem">
                            <summary
                              title={STAVY_UCASTI[na].popis}
                              aria-label={`${tlacitko(l.stav, na)} — ${STAVY_UCASTI[na].popis}`}
                            >
                              {tlacitko(l.stav, na)}…
                            </summary>
                            <form action={stavLodiAkce}>
                              <Skryte serie={serie} zavod={zavod} lod={l} />
                              <input type="hidden" name="stav" value={na} />
                              <textarea
                                name="duvod"
                                required
                                rows={2}
                                maxLength={500}
                                placeholder={na === "KDoplneni" ? "Co má kapitán doplnit" : "Proč"}
                                aria-label={`Důvod: ${STAVY_UCASTI[na].tlacitko}`}
                              />
                              <button type="submit">{tlacitko(l.stav, na)}</button>
                            </form>
                          </details>
                        ))}
                      {l.smiSmazat && (
                        <form action={smazAkce}>
                          <Skryte serie={serie} zavod={zavod} lod={l} />
                          <button
                            type="submit"
                            className="nebezpecne"
                            title="Smaže přihlášku i loď a osobu, pokud vznikly jen kvůli ní."
                          >
                            Smazat
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              )),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Pole, která nese každý formulář u lodi. */
function Skryte({ serie, zavod, lod }: { serie: string; zavod: string; lod: LodNaZastavce }) {
  return (
    <>
      <input type="hidden" name="serie" value={serie} />
      <input type="hidden" name="zavod" value={zavod} />
      <input type="hidden" name="prihlaskaId" value={lod.prihlaskaId} />
      <input type="hidden" name="lod" value={lod.lod} />
    </>
  );
}

const cas = (kdy: string) =>
  new Date(kdy).toLocaleString("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Co přišlo s přihláškou: kapitán, kontakt, posádka, poznámka, startovné
 * a historie. Sbalené, aby tabulka zůstala přehledná — rozbalí se jedním
 * kliknutím, bez javascriptu.
 *
 * <b>Kontakt vidí jen pořadatel a rozhodčí</b>; tahle stránka je pro ně.
 */
function Podrobnosti({ serie, zavod, lod }: { serie: string; zavod: string; lod: LodNaZastavce }) {
  const kontakt = lod.email || lod.telefon;

  return (
    <details className="podrobnosti-lodi">
      <summary>
        {lod.kapitan ?? "Podrobnosti"}
        {kontakt && " · kontakt"}
        {lod.zaplaceno ? " · zaplaceno" : ""}
      </summary>
      <dl className="pravidla">
        {lod.kapitan && (
          <>
            <dt>Kapitán</dt>
            <dd>{lod.kapitan}</dd>
          </>
        )}
        {lod.email && (
          <>
            <dt>E-mail</dt>
            <dd>
              <a href={`mailto:${lod.email}`}>{lod.email}</a>
            </dd>
          </>
        )}
        {lod.telefon && (
          <>
            <dt>Telefon</dt>
            <dd>
              <a href={`tel:${lod.telefon.replace(/[^\d+]/g, "")}`}>{lod.telefon}</a>
            </dd>
          </>
        )}
        {lod.posadka && (
          <>
            <dt>Posádka</dt>
            <dd>{lod.posadka}</dd>
          </>
        )}
        {lod.poznamka && (
          <>
            <dt>Poznámka</dt>
            <dd>{lod.poznamka}</dd>
          </>
        )}
        {lod.podanoV && (
          <>
            <dt>Přihláška</dt>
            <dd>z webu {cas(lod.podanoV)}</dd>
          </>
        )}
        {/* <b>Píše se i to, že souhlas není</b> (nález R9, 28. 10. 2026).
            Prázdná kolonka by vypadala jako „nic zvláštního", jenže tady
            je prázdno zpráva: u poháru, který pořadatelsky ofiko není, je
            souhlas jediná vazba závodníka na pravidla — a lodě navezené
            importem ho nemají skoro žádné. */}
        <dt>Souhlas s pravidly</dt>
        <dd>
          {lod.souhlasV ? (
            `potvrzený ${cas(lod.souhlasV)}`
          ) : (
            <em>nezaznamenaný</em>
          )}
        </dd>
      </dl>

      <form action={startovneAkce} className="startovne">
        <Skryte serie={serie} zavod={zavod} lod={lod} />
        <label>
          <input type="checkbox" name="zaplaceno" defaultChecked={lod.zaplaceno} /> Startovné zaplaceno
        </label>
        <input
          name="poznamka"
          maxLength={200}
          defaultValue={lod.startovnePoznamka ?? ""}
          placeholder="Poznámka (hotově, převodem…)"
          aria-label="Poznámka ke startovnému"
        />
        <button type="submit">Uložit</button>
      </form>

      {lod.historie && lod.historie.length > 0 && (
        <ol className="historie">
          {lod.historie.map((z, i) => (
            <li key={i}>
              {cas(z.kdy)} · {z.kdo ?? "z webu"}: {z.ze ? `${STAVY_UCASTI[z.ze].stitek} → ` : ""}
              {STAVY_UCASTI[z.na].stitek}
              {z.duvod && ` — ${z.duvod}`}
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}

/**
 * Nápis podle směru. „Vrátit mezi nepotvrzené" u zrušené lodi by lhalo —
 * nepotvrzená nikdy nebyla, obnovuje se.
 */
function tlacitko(ze: StavUcasti | null | undefined, na: StavUcasti) {
  if (ze && skupinaStavu(ze) === "mimo" && na === "Prihlasena") return "Vrátit mezi zapsané";
  if (ze === "Potvrzena" && na === "Prihlasena") return "Zrušit prezenci";
  return STAVY_UCASTI[na].tlacitko;
}

function pocet(n: number) {
  return `${n} ${n === 1 ? "přihlášená loď" : n >= 2 && n <= 4 ? "přihlášené lodě" : "přihlášených lodí"}`;
}

/** Věta po zápisu. Skládá se tady, protože akce zná jen jméno a stav. */
function hotovo(stav: string, lod?: string, nastav?: StavUcasti) {
  const kdo = lod ?? "Loď";

  switch (stav) {
    case "prihlasena":
      return `${kdo} je přihlášená. Až bude jisté, že pojede, potvrď ji.`;
    case "jiz":
      return `${kdo} už přihlášená byla. Nic se nezměnilo.`;
    case "prepnuto":
      return nastav ? `${kdo}: ${STAVY_UCASTI[nastav].popis}` : "Hotovo.";
    case "startovne":
      return `${kdo}: startovné uloženo.`;
    case "smazano":
      return `${kdo}: přihláška smazaná.`;
    default:
      return "Hotovo.";
  }
}

/**
 * Vystavený kód u lodi: velkým písmem k opsání a QR k načtení. Je to jeden
 * řetězec ve dvou podobách (Filip, 4. 10. 2026) — posádka u stolu si vybere,
 * co jí vyhovuje, a bez signálu funguje opsání.
 */
function Kod({ kod, doKdy, qr }: { kod: string; doKdy?: string; qr: string | null }) {
  return (
    <div className="kod-u-lodi">
      <p className="kod-velky">{kod}</p>
      {qr && <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} />}
      <p className="poznamka">
        {doKdy ? `Platí do ${new Date(doKdy).toLocaleTimeString("cs-CZ", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "Europe/Prague",
        })}.` : "Platí čtvrt hodiny."}{" "}
        Kdo kód zadá, je posádka.{" "}
        <Link href="/napoveda#role">Kapitána lodi určuje správce ročníku.</Link>
      </p>
    </div>
  );
}
