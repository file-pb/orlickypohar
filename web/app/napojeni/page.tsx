import Link from "next/link";
import { Boky } from "@/app/boky";
import { Drobecky } from "@/app/drobecky";

export const metadata = {
  title: "Napojení appky",
  description: "Kód, kterým se appka Orlického poháru napojí na tvůj účet.",
};

type Parametry = { searchParams: Promise<{ kod?: string }> };

/**
 * Cíl QR z profilu — pro telefon, který ho načetl foťákem místo appkou.
 *
 * <b>Proč QR míří na web, a ne rovnou do appky.</b> Tatáž úvaha jako
 * u klíče k lodi a u kódů připojení: vlastní schéma `orlickypohar://` by
 * u telefonu bez appky skončilo tím, že se nestane vůbec nic. Takhle
 * člověk skončí na stránce, která mu řekne, co dál.
 *
 * <b>Nic se tu neodesílá.</b> Kód se jen ukáže k opsání — napojit se dá
 * jedině v appce, protože klíč musí skončit v jejím úložišti, ne
 * v prohlížeči.
 */
export default async function Napojeni({ searchParams }: Parametry) {
  const { kod } = await searchParams;

  return (
    <Boky>
      <Drobecky cesta={[{ text: "Domů", kam: "/" }, { text: "Napojení appky" }]} />
      <h1>Napojení appky</h1>

      {kod ? (
        <>
          <p>Otevři appku Orlický pohár, dej <b>Mám kód</b> a zadej tohle:</p>
          <p className="kod-velky">{kod}</p>
          <p className="poznamka">
            Kód platí pár minut a uplatnit ho jde jednou. Když propadne, vystav si
            na <Link href="/muj-ucet">svém účtu</Link> nový.
          </p>
        </>
      ) : (
        <p>
          Tahle stránka je cíl QR kódu z <Link href="/muj-ucet">Mého účtu</Link>.
          Bez kódu v adrese nemá co ukázat.
        </p>
      )}

      <p className="poznamka">
        Appku ještě nemáš? <Link href="/appka">Tady se bere.</Link>
      </p>
    </Boky>
  );
}
