"use server";

import { redirect } from "next/navigation";
import { odeber, udel, type Role } from "@/lib/sprava";

/**
 * Zápisy z obrazovky správy. Serverové akce, ne javascript v prohlížeči:
 * formulář odešle prohlížeč sám a token přitom nikam neputuje.
 *
 * Výsledek se předává v adrese a stránka po odeslání přesměruje. Je to
 * vzor „POST, pak přesměruj" — bez něj by obnovení stránky poslalo tentýž
 * formulář znovu a role by se udělovala podruhé.
 *
 * <b>Předává se, co se stalo, ne hotová věta.</b> Stránka zná jména
 * zastávek i rolí, akce jen jejich slugy — a „na zastávce radavska-regata"
 * je věta pro stroj.
 */

const kam = (serie: string, zprava: Record<string, string | undefined>) => {
  const dotaz = new URLSearchParams();
  for (const [klic, hodnota] of Object.entries(zprava)) if (hodnota) dotaz.set(klic, hodnota);
  return `/sprava/${encodeURIComponent(serie)}/opravneni?${dotaz}`;
};

export async function udelAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const email = String(formular.get("email") ?? "").trim();
  const role = String(formular.get("role") ?? "") as Role;
  // Prázdná volba znamená celý ročník. `undefined`, ne prázdný řetězec —
  // ten by API přeložilo na zastávku se jménem "" a nenašlo ji.
  const zavod = String(formular.get("zavod") ?? "") || undefined;

  if (!email) redirect(kam(serie, { chyba: "Vyplň e-mail." }));

  const nepovedlo = await udel(serie, { email, role, zavod });

  redirect(
    nepovedlo
      ? kam(serie, { chyba: nepovedlo.chyba, ucet: nepovedlo.ucetNeni ? "neni" : undefined })
      : kam(serie, { stav: "udeleno", email, role, zavod }),
  );
}

export async function odeberAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const id = Number(formular.get("id"));
  const kdo = String(formular.get("kdo") ?? "");

  const chyba = await odeber(serie, id);

  redirect(chyba ? kam(serie, { chyba }) : kam(serie, { stav: "odebrano", kdo }));
}
