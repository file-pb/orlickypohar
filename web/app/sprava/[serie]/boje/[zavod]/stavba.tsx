"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BARVY, NAZVY_BAREV } from "@/app/znak-boje";
import type { BarvaBoje } from "@/lib/boje";
import {
  NAZVY_SMERU,
  NAZVY_STRAN,
  NAZVY_TYPU,
  SMERY,
  type StranaPrvku,
  type SvetovaStrana,
  type TypPrvku,
} from "@/lib/trat";
import { body, patriSmer, patriStrana } from "@/lib/stavba-prvku";
import { MapkaVyber } from "@/app/mapka-vyber";
import { pipniAkce, slozPrvekAkce } from "./akce";

/**
 * Stavba prvku na vodě: vyber typ, pípej body, prvek vznikne sám.
 *
 * <b>Jednotkou práce je prvek, ne bóje</b> (Filip, 10. 10. 2026).
 * Stavitel nemyslí „pokládám bóji 1 a bóji 2, a potom z nich složím
 * start" — myslí „pokládám start". Jména bójí se proto nezadávají, plynou
 * z typu a pořadí.
 *
 * <b>Pravidla jsou v `lib/stavba-prvku.ts`</b>, čistém modulu bez Reactu,
 * protože tenhle průvodce má jít i do appky. Tahle komponenta umí jen
 * tlačítka a polohu.
 *
 * <b>Poloha se bere při každém doteku znovu.</b> Mezi dvěma body se
 * popojede, takže držet jedno měření by druhou bóji položilo tam, kde
 * stála první.
 */
export function Stavba({
  serie,
  zavod,
  dalsiPoradi,
  stred,
}: {
  serie: string;
  zavod: string;
  /** Kolikátý prvek se staví — jen do automatických jmen. */
  dalsiPoradi: number;
  /** Kam se otevře mapa, když se vybírá bod. Nejlíp poslední bóje. */
  stred: { sirka: number; delka: number };
}) {
  const router = useRouter();
  const [typ, setTyp] = useState<TypPrvku | null>(null);
  const [hotove, setHotove] = useState<number[]>([]);
  const [barva, setBarva] = useState<NonNullable<BarvaBoje> | "">("");
  const [strana, setStrana] = useState<StranaPrvku>(null);
  const [smer, setSmer] = useState<SvetovaStrana>(null);
  const [zMapy, setZMapy] = useState(false);
  const [delam, setDelam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [hlaska, setHlaska] = useState<string | null>(null);

  const kroky = typ ? body(typ) : [];
  const krok = kroky[hotove.length];

  const zacni = (t: TypPrvku) => {
    setTyp(t);
    setHotove([]);
    setStrana(null);
    setSmer(null);
    setChyba(null);
    setHlaska(null);
  };

  const zrus = () => {
    setTyp(null);
    setHotove([]);
    setZMapy(false);
    setChyba(null);
  };

  /**
   * Zapíše bod, ať přišel z telefonu nebo z mapy.
   *
   * <b>Zdroj se rozlišuje.</b> U polohy z mapy se neposílá přesnost —
   * není to měření, takže vymyslet k ní metry by byla lež v datech.
   */
  const zapis = async (
    poloha: { sirka: number; delka: number; presnost: number | null },
    zdroj: "Telefon" | "Mapa",
  ) => {
    if (!typ || !krok) return;
    setDelam(true);
    setChyba(null);

    const { chyba: chybaPipnuti, id } = await pipniAkce(serie, zavod, {
      nazev: krok.jmeno(dalsiPoradi),
      poradi: 0,
      sirka: poloha.sirka,
      delka: poloha.delka,
      presnostM: zdroj === "Telefon" ? poloha.presnost : null,
      nahrazujeId: null,
      zdroj,
      barva: barva || undefined,
    });
    if (chybaPipnuti || id === null) {
      setChyba(chybaPipnuti ?? "Bóji se nepodařilo zapsat.");
      setDelam(false);
      return;
    }

    setZMapy(false);
    const vsechny = [...hotove, id];
    if (vsechny.length < kroky.length) {
      setHotove(vsechny);
      setDelam(false);
      router.refresh();
      return;
    }

    const { chyba: chybaPrvku } = await slozPrvekAkce(serie, zavod, {
      typ,
      poradi: dalsiPoradi,
      bojeAId: vsechny[0],
      bojeBId: vsechny[1] ?? null,
      strana: patriStrana(typ) ? strana : null,
      smer: patriSmer(typ) ? smer : null,
    });

    setDelam(false);
    if (chybaPrvku) {
      setChyba(`Bóje jsou zapsané, ale prvek se nepovedl: ${chybaPrvku}`);
      setTyp(null);
      router.refresh();
      return;
    }

    setHlaska(`${NAZVY_TYPU[typ]} je na trati.`);
    setTyp(null);
    setHotove([]);
    router.refresh();
  };

  const pipni = async () => {
    setDelam(true);
    const poloha = await kdeJsem();
    setDelam(false);
    if (typeof poloha === "string") {
      setChyba(poloha);
      return;
    }
    await zapis(poloha, "Telefon");
  };

  return (
    <section className="stavba" aria-labelledby="stavba-nadpis">
      <h2 id="stavba-nadpis">Postavit prvek</h2>

      {chyba && (
        <p className="hlaska chyba" role="alert">
          {chyba}
        </p>
      )}
      {hlaska && (
        <p className="hlaska" role="status">
          {hlaska}
        </p>
      )}

      {typ === null ? (
        <>
          <p className="poznamka">
            Vyber, co stavíš. Bóje se pojmenují samy a prvek vznikne, jakmile
            pípneš poslední bod.
          </p>
          <div className="chipy">
            {(Object.keys(NAZVY_TYPU) as TypPrvku[]).map((t) => (
              <button key={t} type="button" className="chip" onClick={() => zacni(t)}>
                {NAZVY_TYPU[t]}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="krok">
            <b>{NAZVY_TYPU[typ]}</b> — {krok?.vyzva}
            {kroky.length > 1 && (
              <span className="detail">
                {" "}
                ({hotove.length + 1} z {kroky.length})
              </span>
            )}
          </p>

          <div className="chipy">
            {(Object.keys(NAZVY_BAREV) as NonNullable<BarvaBoje>[]).map((b) => (
              <button
                key={b}
                type="button"
                className={barva === b ? "barva vybrana" : "barva"}
                style={{ background: BARVY[b] }}
                aria-label={NAZVY_BAREV[b]}
                aria-pressed={barva === b}
                title={NAZVY_BAREV[b]}
                onClick={() => setBarva(barva === b ? "" : b)}
              />
            ))}
          </div>

          {patriStrana(typ) && (
            <div className="chipy">
              {(Object.keys(NAZVY_STRAN) as NonNullable<StranaPrvku>[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={strana === s ? "chip vybrany" : "chip"}
                  onClick={() => setStrana(strana === s ? null : s)}
                >
                  {NAZVY_STRAN[s]}
                </button>
              ))}
            </div>
          )}

          {patriSmer(typ) && (
            <div className="chipy">
              {SMERY.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={smer === s ? "chip vybrany" : "chip"}
                  onClick={() => setSmer(smer === s ? null : s)}
                >
                  {NAZVY_SMERU[s]}
                </button>
              ))}
            </div>
          )}

          {/* Dva nástroje na dvě situace (Filip, 10. 10. 2026): bóji,
              kterou pokládáš, pípneš; molo na druhém břehu vybereš
              z mapy, protože tam jezdit nemusíš. */}
          {zMapy ? (
            <MapkaVyber
              stred={stred}
              vyber={(bod) => zapis({ ...bod, presnost: null }, "Mapa")}
              zrus={() => setZMapy(false)}
            />
          ) : (
            <>
              <button type="button" className="velke" onClick={pipni} disabled={delam}>
                {delam ? "Zapisuji…" : "Pípnout tady"}
              </button>
              <button
                type="button"
                className="chip"
                onClick={() => setZMapy(true)}
                disabled={delam}
              >
                Vybrat z mapy
              </button>
              <button type="button" className="zrusit" onClick={zrus} disabled={delam}>
                Zrušit
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
}

/** Poloha z telefonu, nebo text chyby. */
function kdeJsem(): Promise<{ sirka: number; delka: number; presnost: number | null } | string> {
  if (typeof navigator === "undefined" || !navigator.geolocation)
    return Promise.resolve("Tenhle prohlížeč polohu neumí.");

  return new Promise((hotovo) => {
    navigator.geolocation.getCurrentPosition(
      (p) =>
        hotovo({
          sirka: p.coords.latitude,
          delka: p.coords.longitude,
          presnost: Number.isFinite(p.coords.accuracy) ? p.coords.accuracy : null,
        }),
      () => hotovo("Polohu se nepodařilo zjistit. Povol ji v nastavení stránky."),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}

async function pipniBod(
  serie: string,
  zavod: string,
  jmeno: string,
  poloha: { sirka: number; delka: number; presnost: number | null },
  barva: BarvaBoje | null,
): Promise<{ chyba: string | null; id: number | null }> {
  return await pipniAkce(serie, zavod, {
    nazev: jmeno,
    poradi: 0,
    sirka: poloha.sirka,
    delka: poloha.delka,
    presnostM: poloha.presnost,
    nahrazujeId: null,
    barva: barva ?? undefined,
  });
}
