using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class StavUcasti : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Stav",
                table: "Ucasti",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Účasti, které v databázi už jsou, přinesl import ze sešitu
            // rozhodčího nebo zápis výsledků — loď přijela. Výchozí nula by
            // z nich udělala nepotvrzené přihlášky a veřejná stránka by
            // u každé lodi odjeté zastávky psala „čeká na potvrzení".
            migrationBuilder.Sql("""UPDATE "Ucasti" SET "Stav" = 1;""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Stav",
                table: "Ucasti");
        }
    }
}
