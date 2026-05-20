// Content type values — mirrors backend ContentType enum exactly
// Backend: public enum ContentType { Document, Video, Quiz, Link }
export const ContentType = {
    DOCUMENT: 'Document',
    VIDEO: 'Video',
    QUIZ: 'Quiz',
    LINK: 'Link',
};

// Content status values — mirrors backend ContentStatus enum exactly
// Backend: public enum ContentStatus { Active, Archived, Draft }
export const ContentStatus = {
    ACTIVE: 'Active',
    ARCHIVED: 'Archived',
    DRAFT: 'Draft',
};

// Returns a blank content object — mirrors backend CreateContentDto exactly
// Backend fields: CourseID (required), Title (required), Type (required), URI (required), MetadataJSON (optional)
export function emptyContent() {
    return {
        courseID: 0,
        title: '',
        type: ContentType.DOCUMENT,
        uri: '',
        metadataJSON: '',
    };
}