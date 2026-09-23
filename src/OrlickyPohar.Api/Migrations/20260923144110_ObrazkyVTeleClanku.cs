using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class ObrazkyVTeleClanku : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "VTeleClankuId",
                table: "Fotky",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Fotky_VTeleClankuId",
                table: "Fotky",
                column: "VTeleClankuId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Fotky_VTeleClankuId",
                table: "Fotky");

            migrationBuilder.DropColumn(
                name: "VTeleClankuId",
                table: "Fotky");
        }
    }
}
