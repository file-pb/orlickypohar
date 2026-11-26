"use server";

import { redirect } from "next/navigation";
import { odeberKlic, vystavKod } from "@/lib/klice-uctu";

/**
 * Vystaví kód a vrátí se s ním v adrese — stránka ho pak ukáže jako QR
 * i k opsání. Stejný postup jako u kódu k lodi: kód stojí v adrese, ne
 * v session, takže ho člověk má na obrazovce, dokud ji nezavře.
 */
export async function vystavKodAkce() {
  const { stav, data } = await vystavKod();

  if (stav === "neprihlasen" || stav === "odmitnut") redirect("/prihlaseni");
  if (stav !== "ok" || !data)
    redirect(`/muj-ucet?chyba=${encodeURIComponent("Kód se nepovedlo vystavit.")}`);

  redirect(`/muj-ucet?kod=${encodeURIComponent(data.kod)}&doKdy=${encodeURIComponent(data.platiDo)}`);
}

/** Odebere napojený telefon. Cesta ven po ztrátě mobilu. */
export async function odeberKlicAkce(formular: FormData) {
  const id = Number(formular.get("klic") ?? 0);
  const { stav } = await odeberKlic(id);

  if (stav === "neprihlasen" || stav === "odmitnut") redirect("/prihlaseni");
  redirect(
    stav === "ok"
      ? "/muj-ucet?stav=odebrano"
      : `/muj-ucet?chyba=${encodeURIComponent("Telefon se nepovedlo odebrat.")}`,
  );
}
