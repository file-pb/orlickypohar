import { jeZkratka, precti, type Cteni } from "@/lib/souradnice";

/**
 * Rozbalení zkráceného odkazu do mapy. <b>Musí to udělat server</b>: v QR
 * kódu ani ve zprávě od kamaráda nic jiného než zkratka není, a prohlížeč
 * na cizí doménu nedosáhne.
 *
 * <b>Je to požadavek, který posílá náš server ven</b>, takže má úzké
 * hranice:
 *
 * - jen na hostitele, jejichž zkratku umíme (`jeZkratka`),
 * - jen http(s) a nejvýš pět přeskoků,
 * - **čte se jen hlavička `location`**, tělo cílové stránky se nestahuje —
 *   stačí nám adresa, na kterou to vede,
 * - osm vteřin a dost; obrazovka nesmí viset na cizí službě.
 *
 * Co to prozradí: ten, kdo zkratku vyrobil (Seznam, Google), se dozví, že
 * ji někdo rozbalil. Jinak nic — token ani cookie s požadavkem nejdou.
 */

const NEJVIC_PRESKOKU = 5;
const CEKAT_MS = 8000;

export type Rozbaleni = { adresa: string } | { chyba: string };

/**
 * Jeden pokus navíc, když spojení selže.
 *
 * <b>Proč:</b> server webu běží dlouho a drží si spojení otevřená. Když
 * ho protistrana mezitím zavře, první požadavek po pauze spadne hned —
 * ne timeoutem, ale resetem (změřeno 9. 10. 2026: úspěch za 275 ms, pak
 * po chvíli pád za 64 ms). Druhý pokus si otevře nové spojení a projde.
 * Opakuje se **jen chyba spojení**, ne odpověď serveru: na „neexistuje"
 * se ptát dvakrát nemá smysl.
 */
async function jednouZopakuj(kam: URL): Promise<Response> {
  const poslat = () =>
    fetch(kam, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(CEKAT_MS),
      // Bez hlaviček navíc: nic o přihlášeném se ven posílat nemá.
      headers: { accept: "text/html", connection: "close" },
      cache: "no-store",
    });

  try {
    return await poslat();
  } catch {
    return poslat();
  }
}

export async function rozbalZkratku(vstup: string): Promise<Rozbaleni> {
  let kam: URL;
  try {
    kam = new URL(vstup);
  } catch {
    return { chyba: "Tohle není platný odkaz." };
  }

  if (!jeZkratka(kam))
    return { chyba: "Zkrácené odkazy umím rozbalit jen z Mapy.com a Google Maps." };

  for (let skok = 0; skok < NEJVIC_PRESKOKU; skok++) {
    let odpoved: Response;
    try {
      odpoved = await jednouZopakuj(kam);
    } catch {
      return { chyba: "Mapový server se nedaří zavolat. Zkus vložit rovnou souřadnice." };
    }

    const dal = odpoved.headers.get("location");
    if (!dal) {
      // Někde řetěz končí: buď jsme u cíle, nebo zkratka neexistuje.
      return odpoved.ok || odpoved.status === 200
        ? { adresa: kam.href }
        : { chyba: `Zkrácený odkaz nikam nevede (${odpoved.status}).` };
    }

    let dalsi: URL;
    try {
      dalsi = new URL(dal, kam);
    } catch {
      return { chyba: "Zkrácený odkaz vede na nesrozumitelnou adresu." };
    }

    if (dalsi.protocol !== "http:" && dalsi.protocol !== "https:")
      return { chyba: "Zkrácený odkaz vede jinam než na web." };

    kam = dalsi;
  }

  return { chyba: "Zkrácený odkaz se přesměrovává pořád dokola." };
}

/**
 * Celé čtení tak, jak ho potřebuje obrazovka: co jde přečíst rovnou, se
 * přečte, a zkratka se nejdřív rozbalí. <b>Běží na serveru</b>, protože
 * rozbalení je odchozí požadavek.
 *
 * Vrací i `odkud`, tedy adresu po rozbalení — člověk má vidět, kam ta
 * zkratka doopravdy vedla, než podle ní postaví bóji.
 */
export async function prectiISeZkratkou(
  vstup: string,
): Promise<Cteni & { odkud?: string }> {
  const prvni = precti(vstup);
  if (prvni.stav !== "zkratka") return prvni;

  const rozbalene = await rozbalZkratku(prvni.adresa);
  if ("chyba" in rozbalene) return { stav: "nic", duvod: rozbalene.chyba };

  const druhe = precti(rozbalene.adresa);
  // Zkratka rozbalená na něco, z čeho poloha nejde — a druhé kolo by
  // vedlo do nekonečna, takže se tu končí.
  if (druhe.stav === "zkratka")
    return { stav: "nic", duvod: "Ten odkaz vede na další zkratku a to už nerozplétám." };

  return { ...druhe, odkud: rozbalene.adresa };
}
