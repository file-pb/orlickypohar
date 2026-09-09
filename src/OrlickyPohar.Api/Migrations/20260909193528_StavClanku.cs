using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class StavClanku : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // POZOR NA POŘADÍ. Scaffold od EF nejdřív zahodil starý sloupec
            // a pak přidal nový s výchozí nulou, tedy `Draft` — na produkci
            // by tím schoval všechny publikované články a nešlo by je vrátit,
            // protože pravda o nich by odešla s tím sloupcem.
            //
            // Správně je to přidat, převést, teprve pak zahodit.
            migrationBuilder.AddColumn<int>(
                name: "Stav",
                table: "Clanky",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // true → Publikovano (1), false zůstává Draft (0). Skrytý ani
            // smazaný z příznaku vzniknout nemůže, ty stavy dosud neexistovaly.
            migrationBuilder.Sql(@"update ""Clanky"" set ""Stav"" = 1 where ""Publikovano"";");

            migrationBuilder.DropColumn(
                name: "Publikovano",
                table: "Clanky");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Zpátky týmž postupem. Skrytý a smazaný článek se do příznaku
            // nevejdou a stanou se nezveřejněnými — informace se ztratí,
            // ale to je vlastnost toho příznaku, ne chyba převodu.
            migrationBuilder.AddColumn<bool>(
                name: "Publikovano",
                table: "Clanky",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql(@"update ""Clanky"" set ""Publikovano"" = true where ""Stav"" = 1;");

            migrationBuilder.DropColumn(
                name: "Stav",
                table: "Clanky");
        }
    }
}
