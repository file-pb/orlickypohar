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
import { odeberAkce, rozhodniNarokAkce, vystavKodAkce } from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Moje lodě" };

type Parametry = {
  searchParams: Promise<{
    lod?: string;
    kod?: string;
    doKdy?: string;
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
  const { lod, kod, doKdy, chyba, stav } = await searchParams;
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
  const pripojeni: Pripojeny[] = vybrana
    ? ((await pripojeniLodi(vybrana.lodId)).data ?? [])
    : [];
  // Žádosti čekající u téhle lodi a moje vlastní žádosti jinam.
  const zadosti: Narok[] = vybrana ? ((await narokyLodi(vybrana.lodId)).data ?? []) : [];
  const moje = (await mojeNaroky()).data ?? [];

  // QR se kreslí jako SVG přímo do stránky: žádný javascript, žádný další
  // požadavek na obrázek a funguje i v tmavém režimu.
  const qr = kod ? await QRCode.toString(adresaKodu(kod), { type: "svg", margin: 1 }) : null;

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
          {pripojeni.length === 0 ? (
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
    </Boky>
  );
}
