using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduLearn.API.Migrations
{
    /// <inheritdoc />
    public partial class WidenTranscriptGPA : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "GPA",
                table: "Transcripts",
                type: "decimal(4,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(3,2)",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "GPA",
                table: "Transcripts",
                type: "decimal(3,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "decimal(4,2)",
                oldNullable: true);
        }
    }
}
