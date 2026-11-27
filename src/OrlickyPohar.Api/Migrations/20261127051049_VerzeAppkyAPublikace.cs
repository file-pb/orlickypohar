using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class VerzeAppkyAPublikace : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "VerzeAktualizace",
                table: "Zarizeni",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "VerzeCeka",
                table: "Zarizeni",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "VerzeHlasenaV",
                table: "Zarizeni",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerzeKanal",
                table: "Zarizeni",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "VerzeOdV",
                table: "Zarizeni",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerzeOtisk",
                table: "Zarizeni",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerzePlatforma",
                table: "Zarizeni",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerzeSpusteni",
                table: "Zarizeni",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "VerzeAktualizace",
                table: "KliceUctu",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "VerzeCeka",
                table: "KliceUctu",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "VerzeHlasenaV",
                table: "KliceUctu",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerzeKanal",
                table: "KliceUctu",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "VerzeOdV",
                table: "KliceUctu",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerzeOtisk",
                table: "KliceUctu",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerzePlatforma",
                table: "KliceUctu",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerzeSpusteni",
                table: "KliceUctu",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "VerzeAktualizace",
                table: "Klice",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "VerzeCeka",
                table: "Klice",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "VerzeHlasenaV",
                table: "Klice",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerzeKanal",
                table: "Klice",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "VerzeOdV",
                table: "Klice",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerzeOtisk",
                table: "Klice",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerzePlatforma",
                table: "Klice",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerzeSpusteni",
                table: "Klice",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PublikaceAppky",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Platforma = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Kanal = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Otisk = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Aktualizace = table.Column<Guid>(type: "uuid", nullable: false),
                    Commit = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    PublikovanoV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublikaceAppky", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PublikaceAppky_Platforma_Kanal_Otisk_Aktualizace",
                table: "PublikaceAppky",
                columns: new[] { "Platforma", "Kanal", "Otisk", "Aktualizace" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PublikaceAppky_PublikovanoV",
                table: "PublikaceAppky",
                column: "PublikovanoV");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PublikaceAppky");

            migrationBuilder.DropColumn(
                name: "VerzeAktualizace",
                table: "Zarizeni");

            migrationBuilder.DropColumn(
                name: "VerzeCeka",
                table: "Zarizeni");

            migrationBuilder.DropColumn(
                name: "VerzeHlasenaV",
                table: "Zarizeni");

            migrationBuilder.DropColumn(
                name: "VerzeKanal",
                table: "Zarizeni");

            migrationBuilder.DropColumn(
                name: "VerzeOdV",
                table: "Zarizeni");

            migrationBuilder.DropColumn(
                name: "VerzeOtisk",
                table: "Zarizeni");

            migrationBuilder.DropColumn(
                name: "VerzePlatforma",
                table: "Zarizeni");

            migrationBuilder.DropColumn(
                name: "VerzeSpusteni",
                table: "Zarizeni");

            migrationBuilder.DropColumn(
                name: "VerzeAktualizace",
                table: "KliceUctu");

            migrationBuilder.DropColumn(
                name: "VerzeCeka",
                table: "KliceUctu");

            migrationBuilder.DropColumn(
                name: "VerzeHlasenaV",
                table: "KliceUctu");

            migrationBuilder.DropColumn(
                name: "VerzeKanal",
                table: "KliceUctu");

            migrationBuilder.DropColumn(
                name: "VerzeOdV",
                table: "KliceUctu");

            migrationBuilder.DropColumn(
                name: "VerzeOtisk",
                table: "KliceUctu");

            migrationBuilder.DropColumn(
                name: "VerzePlatforma",
                table: "KliceUctu");

            migrationBuilder.DropColumn(
                name: "VerzeSpusteni",
                table: "KliceUctu");

            migrationBuilder.DropColumn(
                name: "VerzeAktualizace",
                table: "Klice");

            migrationBuilder.DropColumn(
                name: "VerzeCeka",
                table: "Klice");

            migrationBuilder.DropColumn(
                name: "VerzeHlasenaV",
                table: "Klice");

            migrationBuilder.DropColumn(
                name: "VerzeKanal",
                table: "Klice");

            migrationBuilder.DropColumn(
                name: "VerzeOdV",
                table: "Klice");

            migrationBuilder.DropColumn(
                name: "VerzeOtisk",
                table: "Klice");

            migrationBuilder.DropColumn(
                name: "VerzePlatforma",
                table: "Klice");

            migrationBuilder.DropColumn(
                name: "VerzeSpusteni",
                table: "Klice");
        }
    }
}
