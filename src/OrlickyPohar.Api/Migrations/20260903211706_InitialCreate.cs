using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Metrics",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Path = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Unit = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    Description = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Metrics", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Quarantine",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SourceId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    MetricPath = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Value = table.Column<double>(type: "double precision", nullable: false),
                    ValidAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ReceivedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    IssuedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    EventId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Reason = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Quarantine", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Measurements",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SourceId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    MetricId = table.Column<int>(type: "integer", nullable: false),
                    ValidAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ReceivedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    IssuedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Value = table.Column<double>(type: "double precision", nullable: false),
                    Quality = table.Column<int>(type: "integer", nullable: false),
                    EventId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Measurements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Measurements_Metrics_MetricId",
                        column: x => x.MetricId,
                        principalTable: "Metrics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Measurements_MetricId",
                table: "Measurements",
                column: "MetricId");

            migrationBuilder.CreateIndex(
                name: "IX_Measurements_SourceId_EventId",
                table: "Measurements",
                columns: new[] { "SourceId", "EventId" },
                unique: true,
                filter: "\"EventId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Measurements_SourceId_MetricId_ValidAt",
                table: "Measurements",
                columns: new[] { "SourceId", "MetricId", "ValidAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Measurements_SourceId_MetricId_ValidAt_IssuedAt",
                table: "Measurements",
                columns: new[] { "SourceId", "MetricId", "ValidAt", "IssuedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Metrics_Path",
                table: "Metrics",
                column: "Path",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Quarantine_MetricPath_ReceivedAt",
                table: "Quarantine",
                columns: new[] { "MetricPath", "ReceivedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Measurements");

            migrationBuilder.DropTable(
                name: "Quarantine");

            migrationBuilder.DropTable(
                name: "Metrics");
        }
    }
}
