using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class Upozorneni : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Odeslani",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Druh = table.Column<int>(type: "integer", nullable: false),
                    Odber = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Titulek = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Text = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    Cesta = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    VzniklV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    OdeslanoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Pokusu = table.Column<int>(type: "integer", nullable: false),
                    Chyba = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ZkusitPo = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Vzdano = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Odeslani", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Zarizeni",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Token = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Platforma = table.Column<int>(type: "integer", nullable: false),
                    Odbery = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ZapsanoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    NaposledyV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Zarizeni", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Odeslani_OdeslanoV_Vzdano_ZkusitPo",
                table: "Odeslani",
                columns: new[] { "OdeslanoV", "Vzdano", "ZkusitPo" });

            migrationBuilder.CreateIndex(
                name: "IX_Zarizeni_Token",
                table: "Zarizeni",
                column: "Token",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Odeslani");

            migrationBuilder.DropTable(
                name: "Zarizeni");
        }
    }
}
