import Link from "next/link";
import { Boky } from "@/app/boky";

export const metadata = {
  title: "Jak se počítají body",
  description: "Nízkobodový systém, kódy, neúčast, 24hodinovka, škrty a rozstřel shody v Orlickém poháru.",
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

      <p>
        Základem jsou{" "}
        <a href="https://rules.sailing.cz/#dodatek-a" target="_blank" rel="noopener noreferrer">
          Závodní pravidla jachtingu 2025–2028
        </a>{" "}
        v překladu ČSJ, bodování je v jejich Dodatku A. Pravidla bodují jednotlivý závod; seriál
        z několika závodů neupravují, to je věc vypsání poháru. Níž je, jak se počítá u nás.
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
        Loď, která nestartovala, nedokončila, odstoupila nebo byla diskvalifikovaná
        (<code>DNS</code>, <code>DNF</code>, <code>RET</code>, <code>DSQ</code> a další), dostane
        podle pravidla A5.2 <b>počet lodí své kategorie přihlášených do závodu plus jedna</b>.
        Všechny kódy stejně: při čtrnácti přihlášených má <code>DNF</code> i <code>DNS</code>{" "}
        patnáct bodů.
      </p>

      <h2>Škrty v závodě</h2>
      <p>
        Okruhový závod, který odjel <b>čtyři a více rozjížděk</b>, škrtá jeden
        nejhorší výsledek (potvrdil rozhodčí). Se třemi a méně se neškrtá nic. Kolik rozjížděk se odjede,
        se rozhoduje na vodě podle větru, takže se škrt odvodí až po závodě —
        a rozhodčí ho smí přepsat.
      </p>

      <h2>Do seriálu: vítěz má 0 bodů</h2>
      <p>
        Jednotlivé regaty se bodují podle svých pravidel a do seriálu se z nich dopočítá
        pořadí v kategorii. Do ročníkové tabulky nejde součet bodů závodu, ale{" "}
        <b>pořadí v kategorii mínus jedna</b>. Vítěz zastávky má nulu, druhý jedničku.
        Vyhrává nejnižší součet.
      </p>
      <p>
        Jsou to dvě stupnice, ne jedna posunutá: v závodě se počítá od jedné,
        v seriálu od nuly.
      </p>
      <ul>
        <li>
          <b>Neúčast</b> (<code>DNC</code>): loď dostane tolik bodů, kolik lodí její kategorie
          bylo do toho závodu přihlášených — o místo víc než poslední, jako v A5.2.
        </li>
        <li>
          <b>24hodinovka</b> je bonus: vítěz má −1, druhý 0, třetí 1. Kdo nejel, bonus nemá.
        </li>
        <li>
          <b>Diskvalifikace v regatě</b> (<code>DSQ</code>) je 20 bodů — při závažném porušení
          pravidel nebo nesplnění alternativního trestu.
        </li>
      </ul>

      <h2>Škrty a shoda bodů</h2>
      <p>
        Nejhorší výsledky ročníku se škrtají: od devíti zastávek <b>dva</b>. Škrtnout se dá
        i dvacítka za diskvalifikaci; při stejně špatných výsledcích se škrtá ten dřívější.
        V tabulce jsou proto dvě čísla, součet a součet po škrtu,
        a škrtnutá zastávka je přeškrtnutá.
      </p>
      <p>Když mají dvě lodě po škrtech stejně bodů, rozhoduje:</p>
      <ol>
        <li>
          <b>počet lepších umístění</b> — kdo má víc prvních míst, pak druhých a tak dál.
          Škrtnuté výsledky se nepočítají;
        </li>
        <li>
          <b>poslední regata sezóny, kterou obě lodě dokončily</b> a žádná z nich ji nemá
          škrtnutou.
        </li>
      </ol>

      <h2>Odkud to víme</h2>
      <p className="poznamka">
        Pravidla seriálu sepsal rozhodčí Miloš Zvonař (YC Písek) a jeho sešit s pořadím 2026
        je naše zkouška: výpočet s ním sedí u všech lodí kromě několika řádků, kde se
        sešit sám přepsal nebo spletl — rozhodčí ty řádky prošel a potvrdil výpočet. Pořád
        otevřené zůstává:
      </p>
      <ul>
        <li>
          <b>20 bodů za diskvalifikaci</b> platí pro ročník 2026; na příští rok se hodnocení
          trestů upraví.
        </li>
        <li>
          <b>Náprava</b> (<code>RDG</code>) je zatím hned za posledním, kdo dojel. Skutečné body
          jí určuje protestní komise.
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
