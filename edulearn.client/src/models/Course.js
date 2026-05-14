// Course status values — mirrors backend CourseStatus enum exactly
// Backend: public enum CourseStatus { Active, Deprecated, Archived }
export const CourseStatus = {
    ACTIVE: 'Active',
    DEPRECATED: 'Deprecated',
    ARCHIVED: 'Archived',
};

// Returns a blank course object — mirrors backend CreateCourseDto exactly
// Backend fields: Code, Title, Description, Credits, DepartmentID, Level, PrerequisitesJSON
export function emptyCourse() {
    return {
        code: '',
        title: '',
        description: '',
        credits: 3,
        departmentID: null,
        level: '',
        prerequisitesJSON: '',
    };
}