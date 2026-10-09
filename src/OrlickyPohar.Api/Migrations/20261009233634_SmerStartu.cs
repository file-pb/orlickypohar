using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class SmerStartu : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DruhStartu",
                table: "PrvkyTrati",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Smer",
                table: "PrvkyTrati",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DruhStartu",
                table: "PrvkyTrati");

            migrationBuilder.DropColumn(
                name: "Smer",
                table: "PrvkyTrati");
        }
    }
}
