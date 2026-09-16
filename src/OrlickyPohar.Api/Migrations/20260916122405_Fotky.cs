using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class Fotky : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "FotkaId",
                table: "Poradatele",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "FotkaId",
                table: "Clanky",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Fotky",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Sirka = table.Column<int>(type: "integer", nullable: false),
                    Vyska = table.Column<int>(type: "integer", nullable: false),
                    Autor = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Popis = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    NahralId = table.Column<Guid>(type: "uuid", nullable: false),
                    NahranoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Fotky", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Fotky_Uzivatele_NahralId",
                        column: x => x.NahralId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Poradatele_FotkaId",
                table: "Poradatele",
                column: "FotkaId");

            migrationBuilder.CreateIndex(
                name: "IX_Clanky_FotkaId",
                table: "Clanky",
                column: "FotkaId");

            migrationBuilder.CreateIndex(
                name: "IX_Fotky_NahralId",
                table: "Fotky",
                column: "NahralId");

            migrationBuilder.AddForeignKey(
                name: "FK_Clanky_Fotky_FotkaId",
                table: "Clanky",
                column: "FotkaId",
                principalTable: "Fotky",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Poradatele_Fotky_FotkaId",
                table: "Poradatele",
                column: "FotkaId",
                principalTable: "Fotky",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Clanky_Fotky_FotkaId",
                table: "Clanky");

            migrationBuilder.DropForeignKey(
                name: "FK_Poradatele_Fotky_FotkaId",
                table: "Poradatele");

            migrationBuilder.DropTable(
                name: "Fotky");

            migrationBuilder.DropIndex(
                name: "IX_Poradatele_FotkaId",
                table: "Poradatele");

            migrationBuilder.DropIndex(
                name: "IX_Clanky_FotkaId",
                table: "Clanky");

            migrationBuilder.DropColumn(
                name: "FotkaId",
                table: "Poradatele");

            migrationBuilder.DropColumn(
                name: "FotkaId",
                table: "Clanky");
        }
    }
}
