using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class PrevzateClanky : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PrevzateClanky",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Zdroj = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    ZdrojOdkaz = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Odkaz = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Titulek = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Perex = table.Column<string>(type: "character varying(401)", maxLength: 401, nullable: true),
                    PublikovanoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    StazenoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrevzateClanky", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PrevzateClanky_Odkaz",
                table: "PrevzateClanky",
                column: "Odkaz",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PrevzateClanky");
        }
    }
}
