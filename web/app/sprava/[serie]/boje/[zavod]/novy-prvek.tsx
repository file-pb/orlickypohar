"use client";

import { useState } from "react";
import type { Boje } from "@/lib/boje";
import {
  dvaBody,
  NAZVY_DRUHU_STARTU,
  NAZVY_SMERU,
  NAZVY_STRAN,
  NAZVY_TYPU,
  POZNAMKA_NEJVIC,
  SMERY,
  stranaPatri,
  type DruhStartu,
  type StranaPrvku,
  type TypPrvku,
} from "@/lib/trat";
import { PRIKLAD, polohaZRadku } from "@/lib/poloha";
import { prvekAkce } from "./akce";

/**
 * Formulář nového prvku.
 *
 * <b>Ukazuje jen to, co vybraný typ potřebuje</b> (Filip, 10. 10. 2026:
 * *„Definovat start je příliš složité. (…) Zpřehledni ten formulář, když
 * se vybere start nebo cíl nebo brána nebo zóna jako dráty nad vodou —
 * tady bude vždy potřeba definovat dva body, na rozdíl od ostatních
 * typů."*). Dřív stálo deset polí pod sebou a u každého druhého byla
 * poznámka „jen u…". Nápis, který říká „tohle teď nevyplňuj", je
 * přiznání, že formulář neumí svou práci.
 *
 * <para>
 * <b>Proč to smí být klientská komponenta:</b> správa javascript má —
 * pípnutí ho používá na polohu z telefonu. Veřejný web ho nemá a nemění
 * se na tom nic. <b>Server zůstává autoritou</b>: tenhle formulář jen
 * schovává pole, pravidla hlídá `Prvky.ProcNejde` v API.
 * </para>
 */
export function NovyPrvek({
  serie,
  zavod,
  boje,
  dalsiPoradi,
}: {
  serie: string;
  zavod: string;
  boje: Boje[];
  dalsiPoradi: number;
}) {
  const [typ, setTyp] = useState<TypPrvku>("OtocnaBoje");
  const [druhyJeBod, setDruhyJeBod] = useState(false);
  const [poloha, setPoloha] = useState("");

  const dvou = dvaBody(typ);
  const chybaPolohy =
    dvou && druhyJeBod && poloha.trim() !== "" && typeof polohaZRadku(poloha) === "string"
      ? (polohaZRadku(poloha) as string)
      : null;

  return (
    <form action={prvekAkce} className="formular">
      <input type="hidden" name="serie" value={serie} />
      <input type="hidden" name="zavod" value={zavod} />

      <label>
        Co to je
        <select
          name="typ"
          required
          value={typ}
          onChange={(e) => setTyp(e.target.value as TypPrvku)}
        >
          {(Object.keys(NAZVY_TYPU) as TypPrvku[]).map((t) => (
            <option key={t} value={t}>
              {NAZVY_TYPU[t]}
            </option>
          ))}
        </select>
      </label>

      <label>
        Pořadí v trati
        <input name="poradi" type="number" min={1} defaultValue={dalsiPoradi} required />
        <span className="poznamka">
          Smí se opakovat — trať, která jede tutéž bóji dvakrát, to potřebuje.
        </span>
      </label>

      <label>
        {dvou ? "První bóje — levobok" : "Bóje"}
        <select name="bojeA" required defaultValue="">
          <option value="" disabled>
            Vyber bóji
          </option>
          {boje.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nazev}
            </option>
          ))}
        </select>
      </label>

      {dvou && (
        <fieldset className="druhy-konec">
          <legend>Druhý bod — pravobok</legend>

          {/* Přepínač místo „nech prázdné a vyplň níž": dvě cesty
              k témuž poli se člověk musí domyslet, přepínač je vidět. */}
          <label className="volba">
            <input
              type="radio"
              name="druhyJe"
              checked={!druhyJeBod}
              onChange={() => setDruhyJeBod(false)}
            />
            je to bóje
          </label>
          <label className="volba">
            <input
              type="radio"
              name="druhyJe"
              checked={druhyJeBod}
              onChange={() => setDruhyJeBod(true)}
            />
            je to něco jiného — molo, objekt na břehu, plavidlo komise, dráty nad vodou
          </label>

          {druhyJeBod ? (
            <>
              <label>
                Čím to je
                <input
                  name="bodPopis"
                  maxLength={60}
                  required
                  placeholder="koupací molo, plavidlo komise, dráty vysokého napětí"
                />
              </label>
              <label>
                Poloha
                <input
                  name="bodPoloha"
                  required
                  inputMode="decimal"
                  placeholder={PRIKLAD}
                  value={poloha}
                  onChange={(e) => setPoloha(e.target.value)}
                  aria-invalid={chybaPolohy ? true : undefined}
                />
                <span className="poznamka">
                  Šířka a délka na jeden řádek, oddělené mezerou nebo čárkou.
                  Desetinná čárka i tečka projdou obojí.
                </span>
                {chybaPolohy && (
                  <span className="poznamka chyba" role="alert">
                    {chybaPolohy}
                  </span>
                )}
              </label>
            </>
          ) : (
            <label>
              Bóje
              <select name="bojeB" required defaultValue="">
                <option value="" disabled>
                  Vyber bóji
                </option>
                {boje.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nazev}
                  </option>
                ))}
              </select>
            </label>
          )}
        </fieldset>
      )}

      {stranaPatri(typ) && (
        <label>
          Kterým bokem se ponechává
          <select name="strana" defaultValue="">
            <option value="">neuvedeno</option>
            {(Object.keys(NAZVY_STRAN) as NonNullable<StranaPrvku>[]).map((s) => (
              <option key={s} value={s}>
                {NAZVY_STRAN[s]}
              </option>
            ))}
          </select>
          <span className="poznamka">
            U průjezdní bóje závisí na směru, kterým se kolem pluje — táž bóje
            může být v trati dvakrát s různým bokem.
          </span>
        </label>
      )}

      {typ === "Start" && (
        <>
          <label>
            Startuje se
            <select name="smer" defaultValue="">
              <option value="">neuvedeno</option>
              {SMERY.map((s) => (
                <option key={s} value={s}>
                  {NAZVY_SMERU[s]}
                </option>
              ))}
            </select>
            <span className="poznamka">
              Podle toho mapka nakreslí šipku průjezdu. Bez směru ji kreslit
              nemůže — vymyslela by si ho.
            </span>
          </label>

          <label>
            Čím je start vytyčený
            <select name="druhStartu" defaultValue="PevnaLinie">
              {(Object.keys(NAZVY_DRUHU_STARTU) as NonNullable<DruhStartu>[]).map((d) => (
                <option key={d} value={d}>
                  {NAZVY_DRUHU_STARTU[d]}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <label>
        Jak to jet
        <input
          name="poznamka"
          maxLength={POZNAMKA_NEJVIC}
          placeholder="na jih, startujeme na zámek"
        />
        <span className="poznamka">
          Vidí to pořadatel i závodník. Na delší vysvětlení je plachetní směrnice.
        </span>
      </label>

      <button type="submit">Přidat prvek</button>
    </form>
  );
}
