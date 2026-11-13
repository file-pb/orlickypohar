using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class KlicPrvku : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "Klic",
                table: "PrvkyTrati",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PrvkyTrati_Klic",
                table: "PrvkyTrati",
                column: "Klic",
                unique: true,
                filter: "\"Klic\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PrvkyTrati_Klic",
                table: "PrvkyTrati");

            migrationBuilder.DropColumn(
                name: "Klic",
                table: "PrvkyTrati");
        }
    }
}
