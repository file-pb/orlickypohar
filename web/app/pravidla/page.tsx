import Link from "next/link";
import { Boky } from "@/app/boky";

export const metadata = {
  title: "Jak se počítají body",
  description: "Nízkobodový systém, kódy, škrty a průběžné pořadí Orlického poháru.",
};

/**
 * Veřejné vysvětlení bodování.
 *
 * Není to jen servis pro čtenáře. **Vystavuje to naše předpoklady na světlo** —
 * co je doložené z výsledkových listin a co je zatím dohad. Kdo tomu rozumí
 * líp než my (rozhodčí), uvidí rozdíl bez toho, aby mu někdo posílal dotazník.
 */
export default function Pravidla() {
  return (
    <Boky>
      <h1>Jak se počítají body</h1>
      <p className="podtitulek">
        Nízkobodový systém ve dvou stupnicích. Vypadá to složitěji, než to je —
        rozdíl mezi nimi je jedna jednička.
      </p>

      <h2>V závodě: vítěz má 1 bod</h2>
      <p>
        Loď dostane v každé rozjížďce <b>pořadí ve své kategorii</b> a body závodu
        jsou jejich součet. Kdo byl ve dvou rozjížďkách první, má dva body a vyhrál.
        Počítá se uvnitř kategorie, ne v celém poli: když v RACE dojely lodě celkově
        druhá, pátá a devátá, mají za tu rozjížďku 1, 2 a 3 body.
      </p>

      <h2>Kdo nedojel</h2>
      <p>
        Loď s kódem dostane <b>místo za posledním, kdo dojel</b> — a kódy se do té
        řady staví podle závažnosti. Lodě se stejným kódem mají stejné body.
      </p>
      <p>
        Při dvanácti dokončivších má <code>DNF</code> třináct bodů a <code>DNS</code>{" "}
        čtrnáct. Když ale <code>DNF</code> nikdo nemá, spadnou všechny <code>DNS</code>{" "}
        na třináct. Není to tedy pevné „+1“ nebo „+2“, ale další volné místo v pořadí.
      </p>

      <h2>Škrty</h2>
      <p>
        Okruhový závod, který odjel <b>čtyři a více rozjížděk</b>, škrtá jeden
        nejhorší výsledek. Se třemi a méně se neškrtá nic. Kolik rozjížděk se odjede,
        se rozhoduje na vodě podle větru, takže se škrt odvodí až po závodě —
        a rozhodčí ho smí přepsat.
      </p>

      <h2>Do seriálu: vítěz má 0 bodů</h2>
      <p>
        Do ročníkové tabulky nejde součet bodů závodu, ale <b>pořadí v kategorii
        mínus jedna</b>. Vítěz zastávky má nulu, druhý jedničku. Vyhrává tedy
        nejnižší součet.
      </p>
      <p>
        Jsou to dvě stupnice, ne jedna posunutá: v závodě se počítá od jedné,
        v seriálu od nuly. V průběžném pořadí se pak <b>škrtá jeden nejhorší
        závod</b> — proto jsou v tabulce dvě čísla, součet a součet po škrtu.
      </p>

      <h2>Co ještě není potvrzené</h2>
      <p className="poznamka">
        Pravidla jsou rozluštěná ze skutečných výsledkových listin a ověřená proti
        sešitu rozhodčího — součet sedí u všech lodí. Tři věci ale z dat čistě
        nevycházejí a čekají na potvrzení:
      </p>
      <ul>
        <li>
          <b>24hodinovka</b> vypadá jako bonus, ne jako dvojnásobek: celé pole se
          posune o jedničku dolů, takže vítěz má −1.
        </li>
        <li>
          <b>Pořadí kódů</b> je doložené jen mezi <code>DNF</code> a <code>DNS</code>.
          Zbytek řadíme podle logiky „kdo víc odjel, je na tom líp“.
        </li>
        <li>
          <b>Pět řádků škrtu</b> v sešitu neodpovídá výpočtu. Držíme to na očích
          místo dopočítávání zpětně — je to otázka na rozhodčího, ne chyba v tabulce.
        </li>
      </ul>

      <p className="poznamka">
        Počítá se z toho, co se skutečně stalo — z pořadí v cíli a kódů. Body se
        nikde neukládají, takže se dají kdykoliv přepočítat podle upřesněných
        pravidel. <Link href="/">Zpátky na ročníky</Link>.
      </p>
    </Boky>
  );
}
