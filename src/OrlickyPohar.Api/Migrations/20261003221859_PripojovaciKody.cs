using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class PripojovaciKody : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PripojovaciKody",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LodId = table.Column<int>(type: "integer", nullable: false),
                    Kod = table.Column<string>(type: "character varying(6)", maxLength: 6, nullable: false),
                    VystavilId = table.Column<Guid>(type: "uuid", nullable: false),
                    VystavenV = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    PlatiDo = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Pouzit = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PripojovaciKody", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PripojovaciKody_Lode_LodId",
                        column: x => x.LodId,
                        principalTable: "Lode",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PripojovaciKody_Uzivatele_VystavilId",
                        column: x => x.VystavilId,
                        principalTable: "Uzivatele",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PripojovaciKody_Kod",
                table: "PripojovaciKody",
                column: "Kod",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PripojovaciKody_LodId",
                table: "PripojovaciKody",
                column: "LodId");

            migrationBuilder.CreateIndex(
                name: "IX_PripojovaciKody_VystavilId",
                table: "PripojovaciKody",
                column: "VystavilId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PripojovaciKody");
        }
    }
}
