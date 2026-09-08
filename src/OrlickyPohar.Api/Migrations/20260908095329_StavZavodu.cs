using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class StavZavodu : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "PuvodniDatum",
                table: "Zavody",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Stav",
                table: "Zavody",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PuvodniDatum",
                table: "Zavody");

            migrationBuilder.DropColumn(
                name: "Stav",
                table: "Zavody");
        }
    }
}
