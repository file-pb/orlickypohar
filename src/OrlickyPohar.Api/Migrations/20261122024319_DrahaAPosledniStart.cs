using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class DrahaAPosledniStart : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Draha",
                table: "Zavody",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "PosledniStartV",
                table: "Zavody",
                type: "time without time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Draha",
                table: "Zavody");

            migrationBuilder.DropColumn(
                name: "PosledniStartV",
                table: "Zavody");
        }
    }
}
