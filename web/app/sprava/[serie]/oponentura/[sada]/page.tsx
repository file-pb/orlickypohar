import Link from "@/app/sprava/odkaz";
import { notFound } from "next/navigation";
import { Drobecky, drobeckySpravy } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { okamzik } from "@/app/datum";
import { NAZVY_STAVU, nactiSadu, type Otazka } from "@/lib/oponentura";
import { Hlas } from "./hlas";
import { dokonciAkce, odpovedAkce, smazHlasAkce } from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Sada otázek — správa" };

type Parametry = {
  params: Promise<{ serie: string; sada: string }>;
  searchParams: Promise<{ chyba?: string; stav?: string; kde?: string }>;
};

/**
 * Jedna sada otázek: otázky pod sebou, u každé volby, text a mikrofon.
 *
 * <b>Nic není povinné a nic se neodesílá naráz.</b> Rozhodčí vyplní, co
 * zrovna ví, a vrátí se. Každá otázka má proto svoje tlačítko — jeden
 * velký formulář by znamenal, že nedokončená odpověď zmizí při prvním
 * zhasnutí telefonu.
 *
 * <b>Hlas je nosná část.</b> Miloš odpovídá hlasem: osm otázek vyřídil
 * třinácti nahrávkami za třináct minut. Mikrofon je proto u každé otázky
 * vedle textu, ne schovaný.
 *
 * Kromě nahrávání je stránka serverová a bez javascriptu, jako zbytek
 * administrace.
 */
export default async function SadaOtazek({ params, searchParams }: Parametry) {
  const { serie, sada } = await params;
  const zpravy = await searchParams;

  const { stav, data } = await nactiSadu(serie, sada);
  if (stav === "neni") notFound();

  return (
    <>
      <Drobecky
        cesta={drobeckySpravy(serie, [
          { text: "Otázky k aplikaci", kam: `/sprava/${encodeURIComponent(serie)}/oponentura` },
          { text: data?.nazev ?? "Sada otázek" },
        ])}
      />
      <h1>{data?.nazev ?? "Sada otázek"}</h1>

      {zpravy.chyba && (
        <p className="hlaska chyba" role="alert">
          {zpravy.chyba}
        </p>
      )}
      {zpravy.stav === "ulozeno" && (
        <p className="hlaska" role="status">
          Odpověď je uložená.
        </p>
      )}
      {zpravy.stav === "smazano" && (
        <p className="hlaska" role="status">
          Nahrávka je smazaná.
        </p>
      )}
      {zpravy.stav === "hotovo" && (
        <p className="hlaska" role="status">
          Označeno jako hotové. Když se k něčemu vrátíš, sada se zase otevře.
        </p>
      )}
      {zpravy.stav === "otevreno" && (
        <p className="hlaska" role="status">
          Sada je zase otevřená.
        </p>
      )}

      {stav === "neprihlasen" || stav === "odmitnut" ? (
        <p className="prazdno">
          Na otázky se musíš <Link href="/prihlaseni">přihlásit</Link>.
        </p>
      ) : stav === "nesmi" ? (
        <p className="prazdno">
          Otázky k aplikaci vidí rozhodčí nebo pořadatel ročníku —{" "}
          <Link href="/napoveda#role">co která role smí</Link>.
        </p>
      ) : data === undefined ? (
        <Vypadek />
      ) : (
        <>
          <p className="uvod-sady">{data.uvod}</p>

          <ol className="otazky">
            {data.otazky.map((o) => (
              <li key={o.kod} id={`otazka-${o.kod}`}>
                <Polozka serie={serie} sada={sada} otazka={o} />
              </li>
            ))}
          </ol>

          <form action={dokonciAkce} className="formular dokonceni">
            <input type="hidden" name="serie" value={serie} />
            <input type="hidden" name="sada" value={sada} />
            <input
              type="hidden"
              name="hotovo"
              value={data.stav === "Odpovezeno" ? "ne" : "ano"}
            />
            <p className="poznamka">
              Stav sady: <strong>{NAZVY_STAVU[data.stav]}</strong>
              {data.dokonceneV ? ` — ${okamzik(data.dokonceneV)}` : ""}
            </p>
            <button type="submit">
              {data.stav === "Odpovezeno"
                ? "Vrátit k rozpracovaným"
                : "Mám to — víc už nedoplním"}
            </button>
          </form>
        </>
      )}
    </>
  );
}

/**
 * Jedna otázka: co se ptáme, co na to stojí, a tři způsoby, jak odpovědět.
 *
 * <b>Volby jsou `radio`, nebo `checkbox`</b> podle toho, co otázka
 * připouští. Pamatuje si to API (`VolbyVice`), ne obrazovka — jinak by
 * zaškrtnutí dvou voleb prošlo formulářem a spadlo až na API.
 */
function Polozka({
  serie,
  sada,
  otazka,
}: {
  serie: string;
  sada: string;
  otazka: Otazka;
}) {
  const vice = otazka.volbyVice;

  return (
    <div className="otazka">
      <p className="otazka-text">{otazka.text}</p>
      {otazka.vysvetleni && <p className="poznamka">{otazka.vysvetleni}</p>}

      <form action={odpovedAkce} className="formular">
        <input type="hidden" name="serie" value={serie} />
        <input type="hidden" name="sada" value={sada} />
        <input type="hidden" name="kod" value={otazka.kod} />

        {otazka.volby.length > 0 && (
          <fieldset className="otazka-volby">
            <legend>{vice ? "Zaškrtni, co platí" : "Vyber jedno"}</legend>
            {otazka.volby.map((v) => (
              <label key={v.kod} className="zaskrtnuti">
                <input
                  type={vice ? "checkbox" : "radio"}
                  name="volba"
                  value={v.kod}
                  defaultChecked={otazka.zaskrtnuto.includes(v.kod)}
                />
                {v.text}
              </label>
            ))}
          </fieldset>
        )}

        <label>
          Odpověď textem (nepovinné)
          <textarea
            name="text"
            rows={3}
            maxLength={4000}
            defaultValue={otazka.odpoved ?? ""}
            placeholder="Když je to na jednu větu, napiš to sem. Jinak je rychlejší hlas."
          />
        </label>

        <button type="submit">Uložit odpověď</button>
      </form>

      <Hlas serie={serie} sada={sada} kod={otazka.kod} />

      {otazka.nahravky.length > 0 && (
        <ul className="nahravky">
          {otazka.nahravky.map((n) => (
            <li key={n.id}>
              {/* Hlas se přehrává přes web, ne z adresy API: token je na
                  serveru a nahrávka se nevydává z veřejné adresy. */}
              <audio
                controls
                preload="none"
                src={
                  `/sprava/${encodeURIComponent(serie)}/oponentura/` +
                  `${encodeURIComponent(sada)}/zvuk/${encodeURIComponent(n.id)}`
                }
              />
              <span className="poznamka">
                {n.sekund ? `${n.sekund} s, ` : ""}
                {okamzik(n.nahranoV)}
                {n.kdo ? `, ${n.kdo}` : ""}
              </span>
              <form action={smazHlasAkce}>
                <input type="hidden" name="serie" value={serie} />
                <input type="hidden" name="sada" value={sada} />
                <input type="hidden" name="kod" value={otazka.kod} />
                <input type="hidden" name="id" value={n.id} />
                <button type="submit" className="odebrat">
                  Smazat nahrávku
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {otazka.odpovezenoV && (
        <p className="poznamka">Naposled uloženo {okamzik(otazka.odpovezenoV)}.</p>
      )}
      {otazka.uvolni && (
        <p className="poznamka otazka-uvolni">Odpověď uvolní: {otazka.uvolni}</p>
      )}
    </div>
  );
}
