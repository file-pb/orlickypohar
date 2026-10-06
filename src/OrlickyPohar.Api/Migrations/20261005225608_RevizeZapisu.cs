using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class RevizeZapisu : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Revize",
                table: "Rozjizdky",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Revize",
                table: "Rozjizdky");
        }
    }
}
