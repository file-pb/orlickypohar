import Link from "next/link";
import { Boky } from "@/app/boky";
import { Drobecky } from "@/app/drobecky";

export const metadata = { title: "Klíč k lodi" };

type Parametry = { searchParams: Promise<{ kod?: string }> };

/**
 * Cíl QR s pozvánkou k mobilnímu klíči.
 *
 * <b>Proč přes web a ne rovnou do appky.</b> QR s vlastním schématem
 * (`orlickypohar://`) je u telefonu bez appky slepá ulička: posádka načte
 * kód a nestane se nic. Takhle skončí tady a stránka ji pošle dál — kdo
 * appku má, přehodí se do ní jedním klepnutím; kdo ne, dozví se, kde ji
 * vzít (Filip, 23. 10. 2026). Je to stejná úvaha jako u kódů připojení.
 *
 * <b>Samo se nic nepáruje.</b> Pozvánka je jednorázová, takže kdyby ji
 * otevření odkazu rovnou spotřebovalo, stačilo by načíst QR omylem a
 * posádka by zůstala bez klíče. Proto je tu tlačítko, ne přesměrování.
 */
export default async function Klic({ searchParams }: Parametry) {
  const { kod } = await searchParams;
  const cista = (kod ?? "").trim();

  return (
    <Boky>
      <Drobecky cesta={[{ text: "Domů", kam: "/" }, { text: "Klíč k lodi" }]} />
      <h1>Klíč k lodi</h1>

      {!cista ? (
        <p className="prazdno">
          Tahle adresa patří pozvánce z QR. Nech si ji vystavit od někoho z lodi —
          v appce nebo na <Link href="/moje-lode">Mojich lodích</Link>.
        </p>
      ) : (
        <>
          <p className="podtitulek">
            Tímhle se telefon spáruje s lodí. Od té chvíle se z něj posílá trasa, kterou
            loď během závodu ujede. <b>Účet k tomu nepotřebuješ.</b>
          </p>

          <h2>Máš appku?</h2>
          <p>
            {/* Obyčejný odkaz na vlastní schéma: appku otevře bez toho, aby
                si web musel pořizovat Universal Links a placený účet
                u Applu. Komu appka chybí, tomu se nestane nic — a právě
                proto je pod tím druhá polovina stránky. */}
            <a className="tlacitko" href={`orlickypohar://klic?kod=${encodeURIComponent(cista)}`}>
              Otevřít v appce a spárovat
            </a>
          </p>

          <h2>Nemáš appku?</h2>
          <p>
            Nainstaluj si ji ze <Link href="/appka">stránky Appka</Link> a tenhle QR načti
            znovu — nebo kód opiš v appce do políčka na obrazovce <i>Klíč k lodi</i>.
          </p>
          <p className="kod-velky">{cista}</p>
          <p className="poznamka">
            Pozvánka platí 48 hodin a dá se uplatnit jednou. Když propadne, stačí si nechat
            vystavit novou — klíč sám pak platí, dokud ho kapitán nevyndá.
          </p>
        </>
      )}
    </Boky>
  );
}
