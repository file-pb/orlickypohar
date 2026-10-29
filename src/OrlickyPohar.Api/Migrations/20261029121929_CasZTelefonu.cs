using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class CasZTelefonu : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PosunCasu",
                table: "UkonyZaJizdy",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ZapsanoV",
                table: "UkonyZaJizdy",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PosunCasu",
                table: "Boje",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ZapsanaV",
                table: "Boje",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PosunCasu",
                table: "UkonyZaJizdy");

            migrationBuilder.DropColumn(
                name: "ZapsanoV",
                table: "UkonyZaJizdy");

            migrationBuilder.DropColumn(
                name: "PosunCasu",
                table: "Boje");

            migrationBuilder.DropColumn(
                name: "ZapsanaV",
                table: "Boje");
        }
    }
}
