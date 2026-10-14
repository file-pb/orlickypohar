import { redirect } from "next/navigation";
import { ApiNedostupne, nactiSerie, nactiSerii, type ZavodShrnuti } from "@/lib/api";
import { dnesVPraze } from "@/lib/terminy";
import { Vypadek } from "@/app/vypadek";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = { title: "Tabule" };

/**
 * Jedna adresa, která vede na tabuli toho, co se zrovna jede
 * (Filip, 15. 10. 2026: *„do meníčka dej odkaz na ten scoreboard live…
 * to pak zapneme v hospodě na telce"*).
 *
 * <b>Proč rozcestník a ne odkaz rovnou v menu:</b> tabule patří závodu,
 * ne ročníku, takže by hlavička musela vědět, který závod je na řadě —
 * a to je dotaz navíc na **každé stránce webu**. Takhle se zeptá jen ten,
 * kdo na tabuli doopravdy jde, a v hospodě se pamatuje jedna adresa.
 *
 * <b>Který závod se vybere:</b> ten, co se jede dnes; jinak nejbližší
 * příští; jinak poslední odjetý. Zrušené se přeskakují — na tabuli zrušeného
 * závodu není co ukazovat.
 */
export default async function Rozcestnik() {
  try {
    const serie = await nactiSerie();
    const rocnik = serie?.[0];
    if (!rocnik) return <Prazdno />;

    const detail = await nactiSerii(rocnik.slug);
    const zavody = (detail?.zavody ?? []).filter((z) => z.stav !== "Zruseny");
    const vybrany = vyber(zavody, dnesVPraze());
    if (!vybrany) return <Prazdno />;

    redirect(`/serie/${rocnik.slug}/zavody/${vybrany.slug}/tabule`);
  } catch (e) {
    if (e instanceof ApiNedostupne) return <Vypadek co="Tabule" />;
    throw e;
  }
}

/**
 * Dnešek má přednost, pak nejbližší příští, pak poslední odjetý.
 * <para>
 * <b>Vícedenní závod se počítá celý</b> — u 24hodinovky i Radavské rallye je
 * druhý den pořád ten závod, a tabule má v tu dobu nejvíc smyslu.
 * </para>
 */
function vyber(zavody: ZavodShrnuti[], dnes: string): ZavodShrnuti | null {
  const probiha = zavody.find((z) => z.datum <= dnes && (z.datumKonce ?? z.datum) >= dnes);
  if (probiha) return probiha;

  const pristi = zavody.filter((z) => z.datum > dnes).sort((a, b) => a.datum.localeCompare(b.datum));
  if (pristi.length > 0) return pristi[0];

  const minule = zavody.filter((z) => z.datum < dnes).sort((a, b) => b.datum.localeCompare(a.datum));
  return minule[0] ?? null;
}

/** Bez jediného závodu není kam poslat. Lepší věta než prázdná obrazovka. */
function Prazdno() {
  return (
    <>
      <h1>Tabule</h1>
      <p className="prazdno">
        Zatím není co promítat — ročník nemá vypsaný žádný závod. Až bude,
        povede tahle adresa rovnou na jeho tabuli.{" "}
        <Link href="/">Zpátky na úvod</Link>.
      </p>
    </>
  );
}
