using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class FotkyPrevzatychClanku : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "FotkaId",
                table: "PrevzateClanky",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Sirka",
                table: "PrevzateClanky",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Vyska",
                table: "PrevzateClanky",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SouboryKeSmazani",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Klic = table.Column<string>(type: "text", nullable: false),
                    PridanoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Pokusu = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SouboryKeSmazani", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SouboryKeSmazani");

            migrationBuilder.DropColumn(
                name: "FotkaId",
                table: "PrevzateClanky");

            migrationBuilder.DropColumn(
                name: "Sirka",
                table: "PrevzateClanky");

            migrationBuilder.DropColumn(
                name: "Vyska",
                table: "PrevzateClanky");
        }
    }
}
