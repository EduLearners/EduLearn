using EduLearn.API.Models;
using EduLearn.API.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace EduLearn.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // ── Auth ──
    public DbSet<User> Users => Set<User>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    // ── SIS ──
    public DbSet<Student> Students => Set<Student>();
    public DbSet<Applicant> Applicants => Set<Applicant>();
    public DbSet<Transcript> Transcripts => Set<Transcript>();
    public DbSet<Section> Sections => Set<Section>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<Room> Rooms => Set<Room>();

    // ── LMS ──
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<EduLearn.API.Models.Program> Programs => Set<EduLearn.API.Models.Program>();
    public DbSet<Syllabus> Syllabi => Set<Syllabus>();
    public DbSet<Content> Contents => Set<Content>();
    public DbSet<Discussion> Discussions => Set<Discussion>();
    public DbSet<Assessment> Assessments => Set<Assessment>();
    public DbSet<Submission> Submissions => Set<Submission>();
    public DbSet<GradeChange> GradeChanges => Set<GradeChange>();

    // ── Finance ──
    public DbSet<FeeSchedule> FeeSchedules => Set<FeeSchedule>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Scholarship> Scholarships => Set<Scholarship>();

    // ── Notification ──
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Ticket> Tickets => Set<Ticket>();

    // ── Analytics ──
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<KPI> KPIs => Set<KPI>();
    public DbSet<AuditPackage> AuditPackages => Set<AuditPackage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ════════════════════════════════════════
        // Auth entities
        // ════════════════════════════════════════

        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(u => u.Role).HasConversion<string>().HasMaxLength(30);
            entity.Property(u => u.Status).HasConversion<string>().HasMaxLength(20);

            entity.HasMany(u => u.AuditLogs)
                  .WithOne(a => a.User)
                  .HasForeignKey(a => a.UserID)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(u => u.Student)
                  .WithOne(s => s.User)
                  .HasForeignKey<Student>(s => s.UserID)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasMany(u => u.InstructorSections)
                  .WithOne(s => s.Instructor)
                  .HasForeignKey(s => s.InstructorID)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasMany(u => u.Notifications)
                  .WithOne(n => n.User)
                  .HasForeignKey(n => n.UserID)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        // ════════════════════════════════════════
        // SIS entities
        // ════════════════════════════════════════

        modelBuilder.Entity<Student>(entity =>
        {
            entity.Property(s => s.EnrollmentStatus).HasConversion<string>().HasMaxLength(20);

            entity.HasMany(s => s.Enrollments)
                  .WithOne(e => e.Student)
                  .HasForeignKey(e => e.StudentID)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasMany(s => s.Submissions)
                  .WithOne(sub => sub.Student)
                  .HasForeignKey(sub => sub.StudentID)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasMany(s => s.Transcripts)
                  .WithOne(t => t.Student)
                  .HasForeignKey(t => t.StudentID)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasMany(s => s.Invoices)
                  .WithOne(i => i.Student)
                  .HasForeignKey(i => i.StudentID)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasMany(s => s.Scholarships)
                  .WithOne(sc => sc.Student)
                  .HasForeignKey(sc => sc.StudentID)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Applicant>(entity =>
        {
            entity.Property(a => a.ApplicationStatus).HasConversion<string>().HasMaxLength(30);
        });

        modelBuilder.Entity<Transcript>(entity =>
        {
            entity.Property(t => t.Status).HasConversion<string>().HasMaxLength(20);
        });

        modelBuilder.Entity<Section>(entity =>
        {
            entity.Property(sec => sec.Status).HasConversion<string>().HasMaxLength(20);

            entity.HasOne(sec => sec.Room)
                  .WithMany(r => r.Sections)
                  .HasForeignKey(sec => sec.RoomID)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasMany(sec => sec.Enrollments)
                  .WithOne(e => e.Section)
                  .HasForeignKey(e => e.SectionID)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasMany(sec => sec.Assessments)
                  .WithOne(a => a.Section)
                  .HasForeignKey(a => a.SectionID)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Room>(entity =>
        {
            entity.Property(r => r.Status).HasConversion<string>().HasMaxLength(20);
        });

        modelBuilder.Entity<Enrollment>(entity =>
        {
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
        });

        // ════════════════════════════════════════
        // LMS entities
        // ════════════════════════════════════════

        modelBuilder.Entity<Course>(entity =>
        {
            entity.Property(c => c.Status).HasConversion<string>().HasMaxLength(20);

            entity.HasMany(c => c.Sections)
                  .WithOne(s => s.Course)
                  .HasForeignKey(s => s.CourseID)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasMany(c => c.Contents)
                  .WithOne(ct => ct.Course)
                  .HasForeignKey(ct => ct.CourseID)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasMany(c => c.Discussions)
                  .WithOne(d => d.Course)
                  .HasForeignKey(d => d.CourseID)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasMany(c => c.Assessments)
                  .WithOne(a => a.Course)
                  .HasForeignKey(a => a.CourseID)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasMany(c => c.Syllabi)
                  .WithOne(sy => sy.Course)
                  .HasForeignKey(sy => sy.CourseID)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<EduLearn.API.Models.Program>(entity =>
        {
            entity.Property(p => p.Status).HasConversion<string>().HasMaxLength(20);

            entity.HasMany(p => p.Students)
                  .WithOne(s => s.Program)
                  .HasForeignKey(s => s.ProgramID)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasMany(p => p.FeeSchedules)
                  .WithOne(f => f.Program)
                  .HasForeignKey(f => f.ProgramID)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Syllabus>(entity =>
        {
            entity.HasOne(sy => sy.CreatedBy)
                  .WithMany()
                  .HasForeignKey(sy => sy.CreatedByFK)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Content>(entity =>
        {
            entity.Property(ct => ct.Type).HasConversion<string>().HasMaxLength(20);
            entity.Property(ct => ct.Status).HasConversion<string>().HasMaxLength(20);

            entity.HasOne(ct => ct.UploadedBy)
                  .WithMany()
                  .HasForeignKey(ct => ct.UploadedByFK)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Discussion>(entity =>
        {
            entity.Property(d => d.Status).HasConversion<string>().HasMaxLength(20);

            entity.HasOne(d => d.ThreadStarter)
                  .WithMany()
                  .HasForeignKey(d => d.ThreadStarterID)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Assessment>(entity =>
        {
            entity.Property(a => a.Type).HasConversion<string>().HasMaxLength(20);
            entity.Property(a => a.Status).HasConversion<string>().HasMaxLength(20);

            entity.HasOne(a => a.CreatedBy)
                  .WithMany()
                  .HasForeignKey(a => a.CreatedByFK)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasMany(a => a.Submissions)
                  .WithOne(s => s.Assessment)
                  .HasForeignKey(s => s.AssessmentID)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Submission>(entity =>
        {
            entity.Property(s => s.Status).HasConversion<string>().HasMaxLength(20);

            entity.HasOne(s => s.Grader)
                  .WithMany()
                  .HasForeignKey(s => s.GraderID)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasMany(s => s.GradeChanges)
                  .WithOne(gc => gc.Submission)
                  .HasForeignKey(gc => gc.SubmissionID)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<GradeChange>(entity =>
        {
            entity.HasOne(gc => gc.ChangedBy)
                  .WithMany()
                  .HasForeignKey(gc => gc.ChangedByFK)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        // ════════════════════════════════════════
        // Finance entities
        // ════════════════════════════════════════

        modelBuilder.Entity<FeeSchedule>(entity =>
        {
            entity.Property(f => f.Status).HasConversion<string>().HasMaxLength(20);
        });

        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.Property(i => i.Status).HasConversion<string>().HasMaxLength(20);

            entity.HasMany(i => i.Payments)
                  .WithOne(p => p.Invoice)
                  .HasForeignKey(p => p.InvoiceID)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.Property(p => p.Method).HasConversion<string>().HasMaxLength(30);
            entity.Property(p => p.Status).HasConversion<string>().HasMaxLength(20);
        });

        modelBuilder.Entity<Scholarship>(entity =>
        {
            entity.Property(sc => sc.Status).HasConversion<string>().HasMaxLength(20);
        });

        // ════════════════════════════════════════
        // Notification entities
        // ════════════════════════════════════════

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.Property(n => n.Category).HasConversion<string>().HasMaxLength(30);
            entity.Property(n => n.Severity).HasConversion<string>().HasMaxLength(20);
            entity.Property(n => n.Status).HasConversion<string>().HasMaxLength(20);
        });

        modelBuilder.Entity<Ticket>(entity =>
        {
            entity.Property(t => t.Priority).HasConversion<string>().HasMaxLength(20);
            entity.Property(t => t.Status).HasConversion<string>().HasMaxLength(20);

            entity.HasOne(t => t.CreatedBy)
                  .WithMany()
                  .HasForeignKey(t => t.CreatedByFK)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(t => t.AssignedTo)
                  .WithMany()
                  .HasForeignKey(t => t.AssignedToFK)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        // ════════════════════════════════════════
        // Analytics entities
        // ════════════════════════════════════════

        modelBuilder.Entity<Report>(entity =>
        {
            entity.Property(r => r.Scope).HasConversion<string>().HasMaxLength(30);

            entity.HasOne(r => r.GeneratedBy)
                  .WithMany()
                  .HasForeignKey(r => r.GeneratedByFK)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<KPI>(entity =>
        {
            entity.Property(k => k.ReportingPeriod).HasConversion<string>().HasMaxLength(20);
        });
    }
}
