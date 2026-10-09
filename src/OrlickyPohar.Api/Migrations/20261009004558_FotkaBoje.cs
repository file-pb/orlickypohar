using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class FotkaBoje : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "FotkaId",
                table: "Boje",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Boje_FotkaId",
                table: "Boje",
                column: "FotkaId");

            migrationBuilder.AddForeignKey(
                name: "FK_Boje_Fotky_FotkaId",
                table: "Boje",
                column: "FotkaId",
                principalTable: "Fotky",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Boje_Fotky_FotkaId",
                table: "Boje");

            migrationBuilder.DropIndex(
                name: "IX_Boje_FotkaId",
                table: "Boje");

            migrationBuilder.DropColumn(
                name: "FotkaId",
                table: "Boje");
        }
    }
}
