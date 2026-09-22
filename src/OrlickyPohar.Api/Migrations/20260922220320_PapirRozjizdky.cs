using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class PapirRozjizdky : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "FotkaId",
                table: "Rozjizdky",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Rozjizdky_FotkaId",
                table: "Rozjizdky",
                column: "FotkaId");

            migrationBuilder.AddForeignKey(
                name: "FK_Rozjizdky_Fotky_FotkaId",
                table: "Rozjizdky",
                column: "FotkaId",
                principalTable: "Fotky",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Rozjizdky_Fotky_FotkaId",
                table: "Rozjizdky");

            migrationBuilder.DropIndex(
                name: "IX_Rozjizdky_FotkaId",
                table: "Rozjizdky");

            migrationBuilder.DropColumn(
                name: "FotkaId",
                table: "Rozjizdky");
        }
    }
}
