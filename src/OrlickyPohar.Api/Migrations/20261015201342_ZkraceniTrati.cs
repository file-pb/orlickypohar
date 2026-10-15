using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrlickyPohar.Api.Migrations
{
    /// <inheritdoc />
    public partial class ZkraceniTrati : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ZkracenoUPrvkuId",
                table: "Trate",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ZkracenoV",
                table: "Trate",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ZkratilId",
                table: "Trate",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Trate_ZkracenoUPrvkuId",
                table: "Trate",
                column: "ZkracenoUPrvkuId");

            migrationBuilder.CreateIndex(
                name: "IX_Trate_ZkratilId",
                table: "Trate",
                column: "ZkratilId");

            migrationBuilder.AddForeignKey(
                name: "FK_Trate_PrvkyTrati_ZkracenoUPrvkuId",
                table: "Trate",
                column: "ZkracenoUPrvkuId",
                principalTable: "PrvkyTrati",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Trate_Uzivatele_ZkratilId",
                table: "Trate",
                column: "ZkratilId",
                principalTable: "Uzivatele",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Trate_PrvkyTrati_ZkracenoUPrvkuId",
                table: "Trate");

            migrationBuilder.DropForeignKey(
                name: "FK_Trate_Uzivatele_ZkratilId",
                table: "Trate");

            migrationBuilder.DropIndex(
                name: "IX_Trate_ZkracenoUPrvkuId",
                table: "Trate");

            migrationBuilder.DropIndex(
                name: "IX_Trate_ZkratilId",
                table: "Trate");

            migrationBuilder.DropColumn(
                name: "ZkracenoUPrvkuId",
                table: "Trate");

            migrationBuilder.DropColumn(
                name: "ZkracenoV",
                table: "Trate");

            migrationBuilder.DropColumn(
                name: "ZkratilId",
                table: "Trate");
        }
    }
}
