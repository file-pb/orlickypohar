import { NEJVIC_MB, type DruhObrazku, type Obrazek } from "@/lib/fotky";
import { nahrajObrazekAkce, odeberObrazekAkce } from "./obrazek-akce";

/**
 * Obrázek v administraci: co je teď vidět, nahrání nového a odebrání.
 * Společné pro článek i medailonek pořadatele.
 *
 * <b>Bez javascriptu</b>, jako zbytek administrace. Soubor odešle prohlížeč
 * obyčejným formulářem a server webu ho předá API.
 *
 * <b>Autor a souhlas jsou povinné</b> a ptá se na ně u každého nahrání
 * (plán, oddíl <i>Fotky</i>): u fotek od pořadatelů a diváků musí být vidět,
 * kdo je fotil a že smějí na web. Doplňovat to dodatečně nikdo nebude.
 */
export function SpravaObrazku({
  serie,
  druh,
  klic,
  obrazek,
  bezObrazku,
}: {
  serie: string;
  druh: DruhObrazku;
  klic: string;
  obrazek?: Obrazek | null;
  /** Co web ukazuje, když vlastní obrázek není. */
  bezObrazku: string;
}) {
  const skryte = (
    <>
      <input type="hidden" name="serie" value={serie} />
      <input type="hidden" name="druh" value={druh} />
      <input type="hidden" name="klic" value={klic} />
    </>
  );

  return (
    <section id="obrazek">
      <h2>Obrázek</h2>

      {obrazek ? (
        <figure className="fotka-clanku" style={{ maxWidth: "24rem" }}>
          <img src={obrazek.nahled} alt={obrazek.popis ?? ""} />
          <figcaption>
            {obrazek.popis && `${obrazek.popis} · `}Foto {obrazek.autor}
          </figcaption>
        </figure>
      ) : (
        <p className="poznamka" style={{ marginTop: 0 }}>
          Vlastní obrázek zatím není. {bezObrazku}
        </p>
      )}

      <form action={nahrajObrazekAkce} className="formular">
        {skryte}

        <label>
          {obrazek ? "Nahradit jinou fotkou" : "Fotka"}
          <input
            name="soubor"
            type="file"
            required
            // Bez HEIC schválně: iPhone pak fotku z knihovny sám převede
            // na JPEG, a ten API přečte.
            accept="image/jpeg,image/png,image/webp"
          />
          <span className="poznamka">
            JPEG, PNG nebo WebP do {NEJVIC_MB} MB. Web ji zmenší a údaje o poloze z ní odstraní.
            Nejlíp vypadá fotka na šířku.
          </span>
        </label>

        <label>
          Autor fotky
          <input name="autor" required maxLength={120} placeholder="Jméno a příjmení" />
          <span className="poznamka">Na webu stojí pod fotkou.</span>
        </label>

        <label>
          Co je na fotce
          <input name="popis" maxLength={300} placeholder="Start Izolepy pod zámkem" />
          <span className="poznamka">Nepovinné. Přečte ho i čtečka obrazovky.</span>
        </label>

        <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
          <input name="souhlas" type="checkbox" required style={{ width: "auto", marginTop: "0.2rem" }} />
          <span>
            Autor souhlasí se zveřejněním fotky na tomhle webu. Kdo fotku nahrál, se zaznamená.
          </span>
        </label>

        <button type="submit">{obrazek ? "Nahradit fotku" : "Nahrát fotku"}</button>
      </form>

      {obrazek && (
        <form action={odeberObrazekAkce} className="formular">
          {skryte}
          <p className="poznamka" style={{ margin: 0 }}>
            Odebraná fotka se smaže i z úložiště. {bezObrazku}
          </p>
          <button type="submit">Odebrat fotku</button>
        </form>
      )}
    </section>
  );
}
