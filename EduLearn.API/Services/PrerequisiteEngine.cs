using System.Text.Json;
using EduLearn.API.DTOs;
using EduLearn.API.Models.Enums;
using EduLearn.API.Repositories.Interfaces;

namespace EduLearn.API.Services;

// PrerequisiteEngine — CCM-03
//
// Checks whether a student has completed all prerequisite courses
// before enrolling in a target course.
//
// Logic:
//   1. Read Course.PrerequisitesJSON → parse array of prerequisite CourseIDs
//   2. For each prerequisite CourseID:
//      a. Find all Sections of that prerequisite course
//      b. Check if the student has an Enrollment in any of those Sections
//         with Status = Enrolled AND GradePostedFlag = true
//      c. If yes → prerequisite is met ✅
//      d. If no  → prerequisite is NOT met ❌
//   3. AllPrerequisitesMet = true only if every prerequisite is met
//
// Multi-table join path:
//   Course.PrerequisitesJSON → [CourseID, ...] → Sections (by CourseID)
//                                               → Enrollments (by SectionID + StudentID)

public class PrerequisiteEngine
{
    private readonly ICourseRepository _courseRepository;
    private readonly ISectionRepository _sectionRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IStudentRepository _studentRepository;

    public PrerequisiteEngine(
        ICourseRepository courseRepository,
        ISectionRepository sectionRepository,
        IEnrollmentRepository enrollmentRepository,
        IStudentRepository studentRepository)
    {
        _courseRepository    = courseRepository;
        _sectionRepository   = sectionRepository;
        _enrollmentRepository = enrollmentRepository;
        _studentRepository   = studentRepository;
    }

    public async Task<PrerequisiteCheckResponseDto> CheckAsync(int courseId, int studentId)
    {
        // Load target course
        var course = await _courseRepository.GetByIdAsync(courseId);

        // Load student
        var student = await _studentRepository.GetByIdAsync(studentId);

        // Build the response shell
        var result = new PrerequisiteCheckResponseDto
        {
            CourseID    = course!.CourseID,
            CourseCode  = course.Code,
            CourseTitle = course.Title,
            StudentID   = student!.StudentID,
            StudentName = student.Name
        };

        // If the course has no prerequisites, all prerequisites are trivially met
        if (string.IsNullOrWhiteSpace(course.PrerequisitesJSON))
        {
            result.AllPrerequisitesMet = true;
            return result;
        }

        // Parse the JSON array of prerequisite CourseIDs — e.g. "[1, 2]"
        List<int> prerequisiteCourseIds;

        try
        {
            prerequisiteCourseIds = JsonSerializer.Deserialize<List<int>>(course.PrerequisitesJSON)
                                    ?? new List<int>();
        }
        catch (JsonException)
        {
            // Malformed PrerequisitesJSON — treat as no prerequisites
            result.AllPrerequisitesMet = true;
            return result;
        }

        // If the parsed list is empty, nothing to check
        if (prerequisiteCourseIds.Count == 0)
        {
            result.AllPrerequisitesMet = true;
            return result;
        }

        // Get ALL enrollments for this student once — avoid N+1 DB calls
        var studentEnrollments = (await _enrollmentRepository.GetByStudentIdAsync(studentId)).ToList();

        // Check each prerequisite course
        var allMet = true;

        foreach (var prereqCourseId in prerequisiteCourseIds)
        {
            // Load the prerequisite course for display info
            var prereqCourse = await _courseRepository.GetByIdAsync(prereqCourseId);

            if (prereqCourse is null)
            {
                // Prerequisite course doesn't exist — treat as not met
                result.Prerequisites.Add(new PrerequisiteDetailDto
                {
                    CourseID    = prereqCourseId,
                    CourseCode  = "UNKNOWN",
                    CourseTitle = "Course not found",
                    Met         = false,
                    CompletedInTerm = null
                });
                allMet = false;
                continue;
            }

            // Find all Sections that belong to this prerequisite course
            var prereqSections = await _sectionRepository.GetByCourseIdAsync(prereqCourseId);
            var prereqSectionIds = prereqSections.Select(s => s.SectionID).ToHashSet();

            // Check if the student has a completed enrollment in any of those sections
            // Completed = Status is Enrolled AND GradePostedFlag = true
            var completedEnrollment = studentEnrollments
                .FirstOrDefault(e =>
                    prereqSectionIds.Contains(e.SectionID) &&
                    e.Status == EnrollmentStatus.Enrolled &&
                    e.GradePostedFlag == true);

            var isMet = completedEnrollment is not null;

            if (!isMet)
                allMet = false;

            // If met, find the term they completed it in
            string? completedTerm = null;

            if (isMet && completedEnrollment is not null)
            {
                var completedSection = prereqSections
                    .FirstOrDefault(s => s.SectionID == completedEnrollment.SectionID);
                completedTerm = completedSection?.Term;
            }

            result.Prerequisites.Add(new PrerequisiteDetailDto
            {
                CourseID        = prereqCourse.CourseID,
                CourseCode      = prereqCourse.Code,
                CourseTitle     = prereqCourse.Title,
                Met             = isMet,
                CompletedInTerm = completedTerm
            });
        }

        result.AllPrerequisitesMet = allMet;
        return result;
    }
}
