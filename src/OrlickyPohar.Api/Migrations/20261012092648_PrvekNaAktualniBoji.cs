using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    /// <summary>
    /// Dožene prvky trati, které zůstaly viset na přenastavené bóji.
    ///
    /// <para>
    /// <b>Proč to vzniklo:</b> přenastavení bóje do 12. 10. 2026 prvky
    /// nepřepojovalo. Prvek tím ukazoval na starý záznam, a protože
    /// <c>PrvekDto</c> nese polohu připojené bóje, kreslila mapka i GPX
    /// trať podle <b>staré</b> polohy — v chartplotteru na lodi bod tam,
    /// kde bóje není. Nová bóje se zároveň hlásila mezi „stojí mimo trať“
    /// a starý záznam nešel uklidit, protože na něj prvek ukazoval.
    /// </para>
    ///
    /// <para>
    /// <b>Jde se celým řetězem, ne o jeden krok.</b> Bóje mohla být
    /// přenastavená víckrát za sebou; cyklus proto běží, dokud se něco
    /// mění, a skončí na nejnovějším nástupci. Pojistka na dvacet kol je
    /// proti zacyklení, kdyby se v datech objevil kruh — žádný vzniknout
    /// nemá, ale migrace nemá být to, co kvůli němu visí.
    /// </para>
    ///
    /// <para>
    /// <b>Idempotentní a bezpečná:</b> hledá jen prvky ukazující na
    /// záznam, který <i>má</i> nástupce, takže nad opravenými daty je to
    /// prázdný běh. Nic nemaže — starý záznam zůstává v historii jako
    /// doklad o tom, jak trať vypadala.
    /// </para>
    /// </summary>
    public partial class PrvekNaAktualniBoji : Migration
    {
        /// <summary>
        /// <b>Veřejné schválně, kvůli testu.</b> Migrace se v CI spustí nad
        /// prázdnou databází, takže ověří syntaxi, ale ne to, že doopravdy
        /// přepojí. Test si proto vyrobí vadná data a pustí <b>tentýž</b>
        /// příkaz — kdyby měl vlastní kopii, měřil by svou kopii.
        /// </summary>
        public const string OpravaSql = """
                DO $$
                DECLARE
                    prvni_konec integer;
                    druhy_konec integer;
                    kolo        integer := 0;
                BEGIN
                    LOOP
                        kolo := kolo + 1;

                        UPDATE "PrvkyTrati" p
                        SET "BojeAId" = n."Id"
                        FROM "Boje" s
                        JOIN "Boje" n ON n."NahrazujeId" = s."Id"
                        WHERE p."BojeAId" = s."Id"
                          AND s."NahrazenaV" IS NOT NULL;

                        GET DIAGNOSTICS prvni_konec = ROW_COUNT;

                        UPDATE "PrvkyTrati" p
                        SET "BojeBId" = n."Id"
                        FROM "Boje" s
                        JOIN "Boje" n ON n."NahrazujeId" = s."Id"
                        WHERE p."BojeBId" = s."Id"
                          AND s."NahrazenaV" IS NOT NULL;

                        GET DIAGNOSTICS druhy_konec = ROW_COUNT;

                        EXIT WHEN prvni_konec + druhy_konec = 0 OR kolo >= 20;
                    END LOOP;
                END $$;
                """;

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder) =>
            migrationBuilder.Sql(OpravaSql);

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Zpátky to nejde a nemá: prvek po opravě ukazuje na bóji,
            // která na trati doopravdy stojí. Vrátit ho na přenastavený
            // záznam by znamenalo tu vadu vyrobit znovu.
        }
    }
}
