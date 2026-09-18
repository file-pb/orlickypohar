using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class TeplotaHladiny : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TeplotyHladiny",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Snimek = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Cas = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Misto = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Teplota = table.Column<decimal>(type: "numeric(4,1)", precision: 4, scale: 1, nullable: false),
                    Pixelu = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeplotyHladiny", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TeplotyHladiny_Cas",
                table: "TeplotyHladiny",
                column: "Cas");

            migrationBuilder.CreateIndex(
                name: "IX_TeplotyHladiny_Snimek_Misto",
                table: "TeplotyHladiny",
                columns: new[] { "Snimek", "Misto" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TeplotyHladiny");
        }
    }
}
