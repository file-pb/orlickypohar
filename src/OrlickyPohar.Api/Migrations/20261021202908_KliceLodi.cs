using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class KliceLodi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Trasy_Lode_LodId",
                table: "Trasy");

            migrationBuilder.DropForeignKey(
                name: "FK_Trasy_Uzivatele_UzivatelId",
                table: "Trasy");

            migrationBuilder.DropIndex(
                name: "IX_Trasy_UzivatelId_LokalniId",
                table: "Trasy");

            migrationBuilder.DropColumn(
                name: "UzivatelId",
                table: "Trasy");

            migrationBuilder.AlterColumn<int>(
                name: "LodId",
                table: "Trasy",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddColumn<int>(
                name: "KlicId",
                table: "Trasy",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Klice",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LodId = table.Column<int>(type: "integer", nullable: false),
                    Otisk = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Jmeno = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    VydalUcetId = table.Column<Guid>(type: "uuid", nullable: false),
                    VydalId = table.Column<Guid>(type: "uuid", nullable: true),
                    VydanV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    PosledniPouzitiV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Sleduje = table.Column<bool>(type: "boolean", nullable: false),
                    OdebranV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Klice", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Klice_Lode_LodId",
                        column: x => x.LodId,
                        principalTable: "Lode",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Klice_Uzivatele_VydalId",
                        column: x => x.VydalId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Pozvanky",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LodId = table.Column<int>(type: "integer", nullable: false),
                    Otisk = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Jmeno = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    VydalUcetId = table.Column<Guid>(type: "uuid", nullable: false),
                    VydanaV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    PlatiDo = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UplatnenaV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pozvanky", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Pozvanky_Lode_LodId",
                        column: x => x.LodId,
                        principalTable: "Lode",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Trasy_KlicId_LokalniId",
                table: "Trasy",
                columns: new[] { "KlicId", "LokalniId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Klice_LodId",
                table: "Klice",
                column: "LodId");

            migrationBuilder.CreateIndex(
                name: "IX_Klice_Otisk",
                table: "Klice",
                column: "Otisk",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Klice_VydalId",
                table: "Klice",
                column: "VydalId");

            migrationBuilder.CreateIndex(
                name: "IX_Pozvanky_LodId",
                table: "Pozvanky",
                column: "LodId");

            migrationBuilder.CreateIndex(
                name: "IX_Pozvanky_Otisk",
                table: "Pozvanky",
                column: "Otisk",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Trasy_Klice_KlicId",
                table: "Trasy",
                column: "KlicId",
                principalTable: "Klice",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Trasy_Lode_LodId",
                table: "Trasy",
                column: "LodId",
                principalTable: "Lode",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Trasy_Klice_KlicId",
                table: "Trasy");

            migrationBuilder.DropForeignKey(
                name: "FK_Trasy_Lode_LodId",
                table: "Trasy");

            migrationBuilder.DropTable(
                name: "Klice");

            migrationBuilder.DropTable(
                name: "Pozvanky");

            migrationBuilder.DropIndex(
                name: "IX_Trasy_KlicId_LokalniId",
                table: "Trasy");

            migrationBuilder.DropColumn(
                name: "KlicId",
                table: "Trasy");

            migrationBuilder.AlterColumn<int>(
                name: "LodId",
                table: "Trasy",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<Guid>(
                name: "UzivatelId",
                table: "Trasy",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Trasy_UzivatelId_LokalniId",
                table: "Trasy",
                columns: new[] { "UzivatelId", "LokalniId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Trasy_Lode_LodId",
                table: "Trasy",
                column: "LodId",
                principalTable: "Lode",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Trasy_Uzivatele_UzivatelId",
                table: "Trasy",
                column: "UzivatelId",
                principalTable: "Uzivatele",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
