using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class VypsaniZavoduASouhlas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PrvniVyzyvaciZnameni",
                table: "Zavody",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Startovne",
                table: "Zavody",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "UzaverkaPrihlasek",
                table: "Zavody",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SouhlasV",
                table: "Ucasti",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SouhlasVerze",
                table: "Ucasti",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PrvniVyzyvaciZnameni",
                table: "Zavody");

            migrationBuilder.DropColumn(
                name: "Startovne",
                table: "Zavody");

            migrationBuilder.DropColumn(
                name: "UzaverkaPrihlasek",
                table: "Zavody");

            migrationBuilder.DropColumn(
                name: "SouhlasV",
                table: "Ucasti");

            migrationBuilder.DropColumn(
                name: "SouhlasVerze",
                table: "Ucasti");
        }
    }
}
