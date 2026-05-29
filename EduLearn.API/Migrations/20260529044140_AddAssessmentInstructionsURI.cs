using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduLearn.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAssessmentInstructionsURI : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "InstructionsURI",
                table: "Assessments",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InstructionsURI",
                table: "Assessments");
        }
    }
}
