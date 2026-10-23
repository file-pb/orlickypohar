import Link from "next/link";
import QRCode from "qrcode";
import { Boky } from "@/app/boky";
import { Drobecky } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { datumClanku } from "@/app/datum";
import {
  NAZEV_ROLE,
  adresaKodu,
  mojeLode,
  mojeNaroky,
  narokyLodi,
  pripojeniLodi,
  type Narok,
  type Pripojeny,
} from "@/lib/pripojeni";
import { adresaKlice, kliceLodi, type Klic } from "@/lib/klice";
import {
  odeberAkce,
  odeberKlicAkce,
  pozviKlicemAkce,
  prepniSledovaniAkce,
  rozhodniNarokAkce,
  vystavKodAkce,
} from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Moje lodě" };

type Parametry = {
  searchParams: Promise<{
    lod?: string;
    kod?: string;
    doKdy?: string;
    klic?: string;
    klicDoKdy?: string;
    chyba?: string;
    stav?: string;
  }>;
};

/**
 * Lodě přihlášeného a připojování posádky.
 *
 * <b>Kapitán tu vystaví kód a ukáže ho jako QR.</b> Posádka ho načte foťákem
 * nebo opíše — je to jeden řetězec ve dvou podobách (Filip, 4. 10. 2026).
 * QR se kreslí na serveru do SVG, takže stránka zůstává bez javascriptu.
 *
 * Kód stojí v adrese, ne v session: po vystavení se stránka načte znovu
 * a kapitán ho má na obrazovce, dokud ji nezavře.
 */
export default async function MojeLode({ searchParams }: Parametry) {
  const { lod, kod, doKdy, klic, klicDoKdy, chyba, stav } = await searchParams;
  const { stav: nacteno, data: lode } = await mojeLode();

  if (nacteno === "neprihlasen" || nacteno === "odmitnut")
    return (
      <Boky>
        <Drobecky cesta={[{ text: "Domů", kam: "/" }, { text: "Moje lodě" }]} />
        <h1>Moje lodě</h1>
        <p className="prazdno">
          Na svoje lodě se musíš <Link href="/prihlaseni">přihlásit</Link>.
        </p>
      </Boky>
    );

  if (nacteno !== "ok" || !lode)
    return (
      <Boky>
        <Vypadek />
      </Boky>
    );

  const vybrana = lod ? lode.find((l) => String(l.lodId) === lod) : undefined;
  // <b>„Nesmím ti to ukázat" není „nikdo tu není."</b> Seznam posádky
  // smí jen kapitán a majitel; posádce vrací API 403 a stránka z toho
  // dělala větu „K lodi zatím nikdo připojený není" — a to ve chvíli,
  // kdy ji čte právě ten, kdo je připojený (testovací session, 16. 10.
  // 2026). Je to týž vzorec jako tichý výpadek u tratí.
  const posadka = vybrana ? await pripojeniLodi(vybrana.lodId) : null;
  const pripojeni: Pripojeny[] = posadka?.data ?? [];
  const spravujeLod = posadka?.stav === "ok";
  // Žádosti čekající u téhle lodi a moje vlastní žádosti jinam.
  //
  // <b>Na žádosti se ptáme jen tehdy, když je smíme dostat.</b> Seznam
  // posádky i seznam žádostí hlídá v API totéž právo
  // (`KodySprava.SmiVystavitAsync` v `KodyEndpoints.cs:118` a `:168`),
  // takže posádce vracel ten druhý dotaz vždycky 403 — požadavek navíc
  // za odpověď, která se zahodí.
  const zadosti: Narok[] =
    vybrana && spravujeLod ? ((await narokyLodi(vybrana.lodId)).data ?? []) : [];
  const moje = (await mojeNaroky()).data ?? [];

  // Telefony na palubě. Fanoušek na ně nemá právo, takže se na ně ani
  // neptáme — je to týž důvod, proč se posádky neptáme na žádosti.
  const smiKlice = vybrana ? vybrana.role !== "Fanousek" : false;
  const klice: Klic[] =
    vybrana && smiKlice ? ((await kliceLodi(vybrana.lodId)).data ?? []) : [];
  const zive = klice.filter((k) => !k.odebran);

  // QR se kreslí jako SVG přímo do stránky: žádný javascript, žádný další
  // požadavek na obrázek a funguje i v tmavém režimu.
  const qr = kod ? await QRCode.toString(adresaKodu(kod), { type: "svg", margin: 1 }) : null;
  const qrKlice = klic
    ? await QRCode.toString(adresaKlice(klic), { type: "svg", margin: 1 })
    : null;

  return (
    <Boky>
      <Drobecky cesta={[{ text: "Domů", kam: "/" }, { text: "Moje lodě" }]} />
      <h1>Moje lodě</h1>

      {chyba && (
        <p className="hlaska chyba" role="alert">
          {chyba}
        </p>
      )}
      {stav === "nove" && (
        <p className="hlaska" role="status">
          Hotovo, k lodi jsi připojený.
        </p>
      )}
      {stav === "uz" && (
        <p className="hlaska" role="status">
          K téhle lodi už jsi připojený, nic se nezměnilo.
        </p>
      )}
      {stav === "odebrano" && (
        <p className="hlaska" role="status">
          Připojení je odebrané.
        </p>
      )}
      {stav === "prijato" && (
        <p className="hlaska" role="status">
          Žádost je přijatá, člověk je teď posádka.
        </p>
      )}
      {stav === "sledujeme" && (
        <p className="hlaska" role="status">
          Telefon se zase sleduje.
        </p>
      )}
      {stav === "nesledujeme" && (
        <p className="hlaska" role="status">
          Telefon se přestal sledovat. V posádce zůstává — až pojede, stačí sledování zapnout.
        </p>
      )}
      {stav === "klic-odebran" && (
        <p className="hlaska" role="status">
          Klíč je odebraný. Ten telefon se bude muset spárovat znovu.
        </p>
      )}
      {stav === "zamitnuto" && (
        <p className="hlaska" role="status">
          Žádost je zamítnutá. Znovu o tuhle loď žádat nemůže.
        </p>
      )}

      {lode.length === 0 ? (
        <p className="prazdno">
          Zatím nepatříš k žádné lodi. Nech si od kapitána nebo od pořadatele
          vystavit kód a <Link href="/pripojeni">připoj se</Link>; když kód
          nemáš, dá se o loď požádat a kapitán to potvrdí. Všechny tři cesty
          jsou v <Link href="/napoveda#moje-lod">nápovědě</Link>.
        </p>
      ) : (
        <ul className="seznam">
          {lode.map((l) => (
            <li key={l.lodId}>
              <b>{l.nazev}</b>
              {l.cisloPlachty && <span className="detail"> {l.cisloPlachty}</span>}{" "}
              <span className="stitek">{NAZEV_ROLE[l.role]}</span>
              {(l.role === "Kapitan" || l.role === "Majitel") && (
                <>
                  {" · "}
                  <Link href={`/moje-lode?lod=${l.lodId}`}>posádka a kód →</Link>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Co jsem si zažádal jinde. Bez tohohle výpisu člověk neví, jestli
          se o jeho žádosti ví, nebo zapadla. */}
      {moje.length > 0 && (
        <>
          <h2>Moje žádosti</h2>
          <ul className="seznam">
            {moje.map((n) => (
              <li key={n.id}>
                <b>{n.lod}</b>{" "}
                <span className="stitek">
                  {n.ceka ? "čeká na kapitána" : n.prijat ? "přijato" : "zamítnuto"}
                </span>
                {n.poznamka && <span className="detail"> {n.poznamka}</span>}
                <span className="detail"> podáno {datumClanku(n.podanV)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {vybrana && (
        <>
          <h2>{vybrana.nazev}: posádka</h2>
          {!spravujeLod ? (
            <p className="prazdno">
              Kdo je k lodi připojený, vidí kapitán a majitel. Ty jsi
              posádka — <Link href="/napoveda#role">co která role smí</Link>.
            </p>
          ) : pripojeni.length === 0 ? (
            <p className="prazdno">
              K lodi zatím nikdo připojený není. Posádka se připojí kódem,
              který tu vystavíš — <Link href="/napoveda#posadka">jak na to</Link>.
            </p>
          ) : (
            <ul className="seznam">
              {pripojeni.map((p) => (
                <li key={p.id}>
                  {p.kdo} <span className="stitek">{NAZEV_ROLE[p.role]}</span>
                  <span className="detail"> připojeno {datumClanku(p.vzniklaV)}</span>
                  <form action={odeberAkce} className="radkove">
                    <input type="hidden" name="lod" value={vybrana.lodId} />
                    <input type="hidden" name="vazba" value={p.id} />
                    <button type="submit">Odebrat</button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {/* Žádosti o loď. Potvrzuje je kapitán, protože jen on ví, kdo
              s ním doopravdy jede (plán, třetí cesta párování). */}
          {zadosti.length > 0 && (
            <>
              <h2>Žádosti o připojení</h2>
              <ul className="seznam">
                {zadosti.map((z) => (
                  <li key={z.id}>
                    <b>{z.kdo}</b>
                    {z.poznamka && <span className="detail"> {z.poznamka}</span>}
                    <span className="detail"> podáno {datumClanku(z.podanV)}</span>
                    <span className="radkove">
                      <form action={rozhodniNarokAkce} className="radkove">
                        <input type="hidden" name="lod" value={vybrana.lodId} />
                        <input type="hidden" name="narok" value={z.id} />
                        <input type="hidden" name="prijmout" value="ano" />
                        <button type="submit">Přijmout jako posádku</button>
                      </form>
                      <form action={rozhodniNarokAkce} className="radkove">
                        <input type="hidden" name="lod" value={vybrana.lodId} />
                        <input type="hidden" name="narok" value={z.id} />
                        <input type="hidden" name="prijmout" value="ne" />
                        <button type="submit">Zamítnout</button>
                      </form>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Tlačítka, na která posádka nemá právo, se nenabízejí —
              stejně jako se u zamčené trati neukáže přidání prvku.
              Dřív vracela jen „Kód se nepovedlo vystavit." */}
          {spravujeLod && (
            <>
          <h2>Připojit dalšího</h2>
          {qr && kod ? (
            <>
              <p>
                Ukaž tohle posádce: načte QR foťákem, nebo opíše kód.{" "}
                {doKdy && <>Platí do {datumClanku(doKdy)}.</>}
              </p>
              <p className="kod-velky">{kod}</p>
              {/* SVG z knihovny, ne obrázek z internetu — vykresluje se na
                  serveru a nikam se neposílá. */}
              <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} />
              <p className="poznamka">
                Kód platí čtvrt hodiny a může ho použít víc lidí. Kdo ho zadá,
                je posádka — <Link href="/napoveda#role">kapitána lodi určuje
                správce ročníku</Link>.
              </p>
            </>
          ) : (
            <form action={vystavKodAkce} className="formular">
              <input type="hidden" name="lod" value={vybrana.lodId} />
              <button type="submit">Vystavit kód</button>
            </form>
          )}
            </>
          )}

          {/* Telefony na palubě — jiná věc než posádka výš.
              Připojení váže účet a dává role; klíč váže telefon a slouží
              k jedinému: posílat trasu. Posádka kvůli němu nemusí mít účet,
              což je celý jeho smysl. */}
          {smiKlice && (
            <>
              <h2>Telefony na palubě</h2>
              <p className="poznamka">
                Telefon se k lodi páruje klíčem, ne účtem — posádka se nemusí nikam
                registrovat. Trasy z něj pak patří téhle lodi.
              </p>

              {zive.length === 0 ? (
                <p className="prazdno">
                  Zatím žádný. Vystav pozvánku a dej ji tomu, kdo pojede.
                </p>
              ) : (
                <ul className="seznam">
                  {zive.map((k) => (
                    <li key={k.id}>
                      <strong>{k.jmeno ?? `Telefon #${k.id}`}</strong>
                      {!k.sleduje && <span className="stitek">nesleduje se</span>}
                      <span className="detail">
                        {" "}
                        spárován {datumClanku(k.vydanV)}
                        {k.posledniPouzitiV
                          ? ` · naposled se ozval ${datumClanku(k.posledniPouzitiV)}`
                          : " · zatím se neozval"}
                      </span>
                      {/* Sáhnout na cizí telefon smí jen kapitán a majitel.
                          Vydat klíč smí víc lidí než ho vzít. */}
                      {spravujeLod && (
                        <>
                          <form action={prepniSledovaniAkce} className="radkove">
                            <input type="hidden" name="lod" value={vybrana.lodId} />
                            <input type="hidden" name="klic" value={k.id} />
                            <input
                              type="hidden"
                              name="sleduje"
                              value={k.sleduje ? "ne" : "ano"}
                            />
                            <button type="submit">
                              {k.sleduje ? "Vypnout sledování" : "Zapnout sledování"}
                            </button>
                          </form>
                          <form action={odeberKlicAkce} className="radkove">
                            <input type="hidden" name="lod" value={vybrana.lodId} />
                            <input type="hidden" name="klic" value={k.id} />
                            <button type="submit">Odebrat</button>
                          </form>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {qrKlice && klic ? (
                <>
                  <h3>Pozvánka pro telefon</h3>
                  <p>
                    Ať si to posádka načte foťákem.{" "}
                    {klicDoKdy && <>Platí do {datumClanku(klicDoKdy)}.</>}
                  </p>
                  <div className="qr" dangerouslySetInnerHTML={{ __html: qrKlice }} />
                  <p className="poznamka">
                    Platí 48 hodin a jen pro jeden telefon. <b>Kód uvidíš jenom teď</b> —
                    server si ho neukládá, takže po zavření stránky je potřeba vystavit
                    novou pozvánku. Kdo appku nemá, dostane na té adrese návod, kde ji vzít.
                  </p>
                </>
              ) : (
                <form action={pozviKlicemAkce} className="formular">
                  <input type="hidden" name="lod" value={vybrana.lodId} />
                  <label>
                    Čí telefon to je <span className="poznamka">(nepovinné)</span>
                    <input type="text" name="jmeno" maxLength={60} placeholder="třeba Honza" />
                  </label>
                  <button type="submit">Vystavit pozvánku</button>
                </form>
              )}
            </>
          )}
        </>
      )}
    </Boky>
  );
}
