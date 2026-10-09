using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class BarvaATvarBoje : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Barva",
                table: "Boje",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Tvar",
                table: "Boje",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Barva",
                table: "Boje");

            migrationBuilder.DropColumn(
                name: "Tvar",
                table: "Boje");
        }
    }
}
