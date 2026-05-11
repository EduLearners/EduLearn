namespace EduLearn.API.Models.Enums;

public enum AssessmentStatus
{
    Draft, Published, Closed, Archived
}

public enum AssessmentType
{
    Assignment, Quiz, Exam
}

public enum SubmissionStatus
{
    Submitted, Graded, Returned, Late, Plagiarised
}

// AGI-04: Plagiarism report lifecycle
public enum PlagiarismStatus
{
    Pending,    // Report filed, awaiting review
    Confirmed,  // Plagiarism confirmed by ITAdmin
    Dismissed   // Report reviewed and dismissed
}
