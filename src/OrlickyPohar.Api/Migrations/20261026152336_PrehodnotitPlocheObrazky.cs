using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class PrehodnotitPlocheObrazky : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Sběr se ptá na stránku článku jen tehdy, když `OdZdroje` nezná.
            // Vynulovat ho je tedy způsob, jak říct „rozhodni se u těchhle
            // článků znovu" — teď už i podle plochosti obrázku, kterou dřív
            // nikdo neměřil.
            //
            // Jen články, jejichž obrázek leží volně v knihovně zdroje: tam se
            // nápisy objevují. Obrázek z vlastní složky článku se nemění
            // a logo z podsložky se zahazuje tak jako tak, takže ty by se
            // ptaly nadarmo.
            migrationBuilder.Sql(
                """
                UPDATE "PrevzateClanky"
                   SET "OdZdroje" = NULL
                 WHERE "Obrazek" LIKE '%/ikony-loga/%'
                   AND "Obrazek" NOT LIKE '%/ikony-loga/%/%';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
