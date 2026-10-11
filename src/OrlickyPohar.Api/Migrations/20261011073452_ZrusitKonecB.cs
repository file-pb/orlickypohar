using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    /// <summary>
    /// Ruší <c>KonecBSirka/Delka/Popis</c> na prvku trati. Od #218 do nich
    /// nikdo nepíše: nebójový bod se ukládá jako záznam značky a formulář
    /// si druhý konec vybírá ze seznamu.
    ///
    /// <para>
    /// <b>Napřed se přesun dožene, teprve pak se ruší.</b> Přesun v #209
    /// bral jen řádky, které měly obě souřadnice a prázdné
    /// <c>BojeBId</c>; kdyby nějaký minul, zahodily by se tu jeho jediné
    /// údaje o tom, kde ten konec byl. Proti produkčním datům to
    /// vyzkoušet nejde — produkční databáze se odsud nečte a CI ověří
    /// jen průběh nad prázdnou tabulkou —, takže se to radši udělá
    /// znovu. Nad přestěhovanými daty je to prázdný běh.
    /// </para>
    /// </summary>
    public partial class ZrusitKonecB : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Totéž, co dělal #209. Idempotentní: hledá řádky, kterým
            // druhý konec v podobě značky pořád chybí.
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

            migrationBuilder.DropColumn(
                name: "KonecBDelka",
                table: "PrvkyTrati");

            migrationBuilder.DropColumn(
                name: "KonecBPopis",
                table: "PrvkyTrati");

            migrationBuilder.DropColumn(
                name: "KonecBSirka",
                table: "PrvkyTrati");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "KonecBDelka",
                table: "PrvkyTrati",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "KonecBPopis",
                table: "PrvkyTrati",
                type: "character varying(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "KonecBSirka",
                table: "PrvkyTrati",
                type: "double precision",
                nullable: true);
        }
    }
}
