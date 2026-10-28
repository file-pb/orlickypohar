using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class ZruseniSDuvodemASpesneZpravy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DuvodZruseni",
                table: "Rozjizdky",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Spesne",
                table: "Odeslani",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DuvodZruseni",
                table: "Rozjizdky");

            migrationBuilder.DropColumn(
                name: "Spesne",
                table: "Odeslani");
        }
    }
}
