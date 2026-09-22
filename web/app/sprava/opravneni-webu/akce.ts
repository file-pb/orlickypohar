"use server";

import { redirect } from "next/navigation";
import { odeberZWebu, udelNaWebu, type Role } from "@/lib/sprava";

/** Stejný vzor jako u ročníku: POST, pak přesměruj s tím, co se stalo. */
const kam = (zprava: Record<string, string | undefined>) => {
  const dotaz = new URLSearchParams();
  for (const [klic, hodnota] of Object.entries(zprava)) if (hodnota) dotaz.set(klic, hodnota);
  return `/sprava/opravneni-webu?${dotaz}`;
};

export async function udelNaWebuAkce(formular: FormData) {
  const email = String(formular.get("email") ?? "").trim();
  const role = String(formular.get("role") ?? "") as Role;
  if (!email) redirect(kam({ chyba: "Vyplň e-mail." }));

  const chyba = await udelNaWebu({ email, role });
  redirect(chyba ? kam({ chyba }) : kam({ stav: "udeleno", email }));
}

export async function odeberZWebuAkce(formular: FormData) {
  const chyba = await odeberZWebu(Number(formular.get("id")));
  redirect(chyba ? kam({ chyba }) : kam({ stav: "odebrano", kdo: String(formular.get("kdo") ?? "") }));
}
