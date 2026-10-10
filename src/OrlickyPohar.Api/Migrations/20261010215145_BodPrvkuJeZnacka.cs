using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <summary>
    /// Nebójový konec prvku se stěhuje do záznamu značky (Filip, 10. 10. 2026:
    /// <i>„cíl mezi lodí a molem je dost pravděpodobný“</i>, a totéž u startu).
    ///
    /// <para>
    /// <b>Sloupce se tady neruší.</b> Kód od téhle změny zapisuje každý bod
    /// jako záznam a čte ho z nich, ale <c>KonecBSirka/Delka/Popis</c>
    /// zůstávají jako záložní cesta: kdyby přesun nějaký řádek minul, veřejná
    /// stránka trati ho pořád přečte. Zruší se až dalším krokem, nad daty,
    /// o kterých už bude ověřeno, že jsou přestěhovaná.
    /// </para>
    ///
    /// <para>
    /// <b>Co se nedá odvodit, se nevymýšlí.</b> Značení zůstane prázdné —
    /// z popisu „plavidlo komise“ by se dalo hádat, ale hádat se v záznamu
    /// nemá. Autora bere z bóje na prvním konci téhož prvku: v SQL není
    /// přihlášený uživatel a ten člověk to tehdy zapisoval. Zdroj je
    /// <c>Mapa</c> (1), protože to byly opsané souřadnice, které nikdo
    /// neměřil, a přesnost proto zůstane prázdná.
    /// </para>
    /// </summary>
    public partial class BodPrvkuJeZnacka : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Cyklus, ne jedno INSERT ... SELECT: ke každému vloženému
            // záznamu je potřeba znát jeho id, aby se dalo dosadit do prvku,
            // a RETURNING se u hromadného vkládání na původní řádek nenaváže.
            migrationBuilder.Sql("""
                DO $$
                DECLARE
                    r RECORD;
                    nove_id integer;
                    dalsi_poradi integer;
                BEGIN
                    FOR r IN
                        SELECT p."Id"           AS prvek,
                               t."ZavodId"      AS zavod,
                               p."KonecBPopis"  AS nazev,
                               p."KonecBSirka"  AS sirka,
                               p."KonecBDelka"  AS delka,
                               a."PostavilId"   AS kdo,
                               a."PostavenaV"   AS kdy
                        FROM "PrvkyTrati" p
                        JOIN "Trate" t ON t."Id" = p."TratId"
                        JOIN "Boje"  a ON a."Id" = p."BojeAId"
                        WHERE p."KonecBSirka" IS NOT NULL
                          AND p."KonecBDelka" IS NOT NULL
                          AND p."BojeBId" IS NULL
                        ORDER BY p."Id"
                    LOOP
                        -- Za poslední stojící značku regaty, stejně jako pípnutí.
                        SELECT COALESCE(MAX(b."Poradi"), 0) + 1
                          INTO dalsi_poradi
                          FROM "Boje" b
                         WHERE b."ZavodId" = r.zavod
                           AND b."NahrazenaV" IS NULL
                           AND b."SebranaV" IS NULL;

                        INSERT INTO "Boje"
                            ("ZavodId", "Nazev", "Poradi", "Sirka", "Delka",
                             "Zdroj", "PostavenaV", "PostavilId")
                        VALUES
                            (r.zavod,
                             -- Jméno je povinné. Prázdný popis by zápis shodil,
                             -- a tichý pád migrace je horší než zástupné jméno.
                             COALESCE(NULLIF(btrim(r.nazev), ''), 'bod prvku'),
                             dalsi_poradi, r.sirka, r.delka,
                             1, r.kdy, r.kdo)
                        RETURNING "Id" INTO nove_id;

                        UPDATE "PrvkyTrati"
                           SET "BojeBId" = nove_id
                         WHERE "Id" = r.prvek;
                    END LOOP;
                END $$;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Schéma se nemění, takže vracet není co. Data zpátky nejdou:
            // po přesunu se už nedá poznat, které záznamy značek vznikly
            // tady a které pípnutím — a vracet obojí by smazalo i to, co
            // někdo postavil. Starý kód navíc čte druhý konec z bóje
            // dřív než ze sloupců, takže přestěhovaná data přečte taky.
        }
    }
}
