using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduLearn.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPlagiarismReports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PlagiarismReports",
                columns: table => new
                {
                    ReportID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SubmissionID = table.Column<int>(type: "int", nullable: false),
                    FlaggedByUserID = table.Column<int>(type: "int", nullable: false),
                    SimilarityScore = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    Details = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    FlaggedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlagiarismReports", x => x.ReportID);
                    table.ForeignKey(
                        name: "FK_PlagiarismReports_Submissions_SubmissionID",
                        column: x => x.SubmissionID,
                        principalTable: "Submissions",
                        principalColumn: "SubmissionID");
                    table.ForeignKey(
                        name: "FK_PlagiarismReports_Users_FlaggedByUserID",
                        column: x => x.FlaggedByUserID,
                        principalTable: "Users",
                        principalColumn: "UserID");
                });

            migrationBuilder.CreateIndex(
                name: "IX_PlagiarismReports_FlaggedByUserID",
                table: "PlagiarismReports",
                column: "FlaggedByUserID");

            migrationBuilder.CreateIndex(
                name: "IX_PlagiarismReports_SubmissionID",
                table: "PlagiarismReports",
                column: "SubmissionID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlagiarismReports");
        }
    }
}
