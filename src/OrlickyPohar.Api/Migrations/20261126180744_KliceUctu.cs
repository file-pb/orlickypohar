using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class KliceUctu : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "KliceUctu",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UzivatelId = table.Column<Guid>(type: "uuid", nullable: false),
                    Otisk = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Zarizeni = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    VydanV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    OzvalSeV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    OdebranV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KliceUctu", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KliceUctu_Uzivatele_UzivatelId",
                        column: x => x.UzivatelId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NapojeniUctu",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UzivatelId = table.Column<Guid>(type: "uuid", nullable: false),
                    Otisk = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    VydanV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    PlatiDo = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UplatnenV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NapojeniUctu", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NapojeniUctu_Uzivatele_UzivatelId",
                        column: x => x.UzivatelId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_KliceUctu_Otisk",
                table: "KliceUctu",
                column: "Otisk",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_KliceUctu_UzivatelId",
                table: "KliceUctu",
                column: "UzivatelId");

            migrationBuilder.CreateIndex(
                name: "IX_NapojeniUctu_Otisk",
                table: "NapojeniUctu",
                column: "Otisk",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NapojeniUctu_UzivatelId_PlatiDo",
                table: "NapojeniUctu",
                columns: new[] { "UzivatelId", "PlatiDo" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "KliceUctu");

            migrationBuilder.DropTable(
                name: "NapojeniUctu");
        }
    }
}
