using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduLearn.API.Migrations
{
    /// <inheritdoc />
    public partial class AddEnrollmentUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Enrollments_StudentID",
                table: "Enrollments");

            migrationBuilder.CreateIndex(
                name: "IX_Enrollments_StudentID_SectionID",
                table: "Enrollments",
                columns: new[] { "StudentID", "SectionID" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Enrollments_StudentID_SectionID",
                table: "Enrollments");

            migrationBuilder.CreateIndex(
                name: "IX_Enrollments_StudentID",
                table: "Enrollments",
                column: "StudentID");
        }
    }
}
