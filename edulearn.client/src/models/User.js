export const UserRoles = {
    STUDENT: 'Student',
    INSTRUCTOR: 'Instructor',
    REGISTRAR: 'Registrar',
    DEPT_ADMIN: 'DeptAdmin',
    FINANCE: 'Finance',
    IT_ADMIN: 'ITAdmin',
    AUDITOR: 'Auditor',
};

export const PRIVILEGED_ROLES = [
    UserRoles.REGISTRAR,
    UserRoles.DEPT_ADMIN,
    UserRoles.FINANCE,
    UserRoles.IT_ADMIN,
    UserRoles.AUDITOR,
];

export function isPrivileged(role) {
    return PRIVILEGED_ROLES.includes(role);
}