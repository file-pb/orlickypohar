using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class StavVysledku : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DuvodRevize",
                table: "Rozjizdky",
                type: "character varying(400)",
                maxLength: 400,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Publikovano",
                table: "Rozjizdky",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "StavVysledku",
                table: "Rozjizdky",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Rozjížďky, které v databázi už jsou, přišly importem ze sešitu
            // rozhodčího a jsou na webu vidět. Nový sloupec je nesmí schovat:
            // veřejné čtení se od téhle migrace ptá na publikaci rozjížďky,
            // takže bez dorovnání by ročník ze dne na den zmizel.
            //
            // Potvrzeno, ne Navrzeno: importovaný výsledek není návrh, prošel
            // rukama rozhodčího dřív, než se soubor vyrobil.
            migrationBuilder.Sql(
                """UPDATE "Rozjizdky" SET "StavVysledku" = 3, "Publikovano" = true;""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DuvodRevize",
                table: "Rozjizdky");

            migrationBuilder.DropColumn(
                name: "Publikovano",
                table: "Rozjizdky");

            migrationBuilder.DropColumn(
                name: "StavVysledku",
                table: "Rozjizdky");
        }
    }
}
