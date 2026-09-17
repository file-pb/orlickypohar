using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class PrihlaskyStavyKontakty : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "KontaktEmail",
                table: "Ucasti",
                type: "character varying(320)",
                maxLength: 320,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "KontaktTelefon",
                table: "Ucasti",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PodanoV",
                table: "Ucasti",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Poznamka",
                table: "Ucasti",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StartovnePoznamka",
                table: "Ucasti",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Zaplaceno",
                table: "Ucasti",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "CisloCsj",
                table: "Osoby",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "KontaktyOsob",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OsobaId = table.Column<int>(type: "integer", nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    Telefon = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    ZadanoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UcastId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KontaktyOsob", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KontaktyOsob_Osoby_OsobaId",
                        column: x => x.OsobaId,
                        principalTable: "Osoby",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_KontaktyOsob_Ucasti_UcastId",
                        column: x => x.UcastId,
                        principalTable: "Ucasti",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "ZmenyUcasti",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UcastId = table.Column<int>(type: "integer", nullable: false),
                    Ze = table.Column<int>(type: "integer", nullable: true),
                    Na = table.Column<int>(type: "integer", nullable: false),
                    Kdy = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UzivatelId = table.Column<Guid>(type: "uuid", nullable: true),
                    Duvod = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ZmenyUcasti", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ZmenyUcasti_Ucasti_UcastId",
                        column: x => x.UcastId,
                        principalTable: "Ucasti",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ZmenyUcasti_Uzivatele_UzivatelId",
                        column: x => x.UzivatelId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_KontaktyOsob_OsobaId_ZadanoV",
                table: "KontaktyOsob",
                columns: new[] { "OsobaId", "ZadanoV" });

            migrationBuilder.CreateIndex(
                name: "IX_KontaktyOsob_UcastId",
                table: "KontaktyOsob",
                column: "UcastId");

            migrationBuilder.CreateIndex(
                name: "IX_ZmenyUcasti_UcastId",
                table: "ZmenyUcasti",
                column: "UcastId");

            migrationBuilder.CreateIndex(
                name: "IX_ZmenyUcasti_UzivatelId",
                table: "ZmenyUcasti",
                column: "UzivatelId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "KontaktyOsob");

            migrationBuilder.DropTable(
                name: "ZmenyUcasti");

            migrationBuilder.DropColumn(
                name: "KontaktEmail",
                table: "Ucasti");

            migrationBuilder.DropColumn(
                name: "KontaktTelefon",
                table: "Ucasti");

            migrationBuilder.DropColumn(
                name: "PodanoV",
                table: "Ucasti");

            migrationBuilder.DropColumn(
                name: "Poznamka",
                table: "Ucasti");

            migrationBuilder.DropColumn(
                name: "StartovnePoznamka",
                table: "Ucasti");

            migrationBuilder.DropColumn(
                name: "Zaplaceno",
                table: "Ucasti");

            migrationBuilder.DropColumn(
                name: "CisloCsj",
                table: "Osoby");
        }
    }
}
