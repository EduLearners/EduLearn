// Assessment type values — mirrors backend AssessmentType enum exactly
// Backend: public enum AssessmentType { Assignment, Quiz, Exam }
export const AssessmentType = {
    ASSIGNMENT: 'Assignment',
    QUIZ: 'Quiz',
    EXAM: 'Exam',
};

// Assessment status values — mirrors backend AssessmentStatus enum exactly
// Backend: public enum AssessmentStatus { Draft, Published, Closed, Archived }
export const AssessmentStatus = {
    DRAFT: 'Draft',
    PUBLISHED: 'Published',
    CLOSED: 'Closed',
    ARCHIVED: 'Archived',
};

// Submission status values — mirrors backend SubmissionStatus enum exactly
// Backend: public enum SubmissionStatus { Submitted, Graded, Returned, Late, Plagiarised }
export const SubmissionStatus = {
    SUBMITTED: 'Submitted',
    GRADED: 'Graded',
    RETURNED: 'Returned',
    LATE: 'Late',
    PLAGIARISED: 'Plagiarised',
};

// Returns a blank assessment object — mirrors backend CreateAssessmentDto exactly
// Backend fields: CourseID (required), SectionID, Title, Type, DueAt, MaxScore, GradingRubricJSON, CreatedByFK
export function emptyAssessment() {
    return {
        courseID: 0,
        sectionID: null,
        title: '',
        type: AssessmentType.ASSIGNMENT,
        dueAt: '',
        maxScore: 100,
        gradingRubricJSON: '',
        createdByFK: 0,
    };
}

// Returns a blank submission object — mirrors backend CreateSubmissionDto exactly
// Backend fields: AssessmentID (required), StudentID (required), FileURI (optional)
export function emptySubmission() {
    return {
        assessmentID: 0,
        studentID: 0,
        fileURI: '',
    };
}