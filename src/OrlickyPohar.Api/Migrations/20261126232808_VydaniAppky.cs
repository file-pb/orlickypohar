using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class VydaniAppky : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VydaniAppky",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Platforma = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CisloBalicku = table.Column<int>(type: "integer", nullable: false),
                    Otisk = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Commit = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    VydanoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VydaniAppky", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VydaniAppky_Platforma_CisloBalicku",
                table: "VydaniAppky",
                columns: new[] { "Platforma", "CisloBalicku" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VydaniAppky");
        }
    }
}
