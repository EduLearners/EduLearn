# ============================================================
# seed-sample-data.ps1 - Comprehensive, fully-linked sample data
# for MANUAL testing of EduLearn across all 7 roles.
#
# Creates (in dependency order):
#   role accounts + extra students/instructors -> programs -> courses
#   -> rooms -> students -> sections -> enrollments -> assessments
#   -> content -> submissions(+grading) -> applicants -> fees
#   -> scholarships -> invoices -> payments -> notifications
#   -> tickets -> transcripts
#
# Every row is created through the REAL API as the correctly-authorised
# role, so the data is exactly what the app would produce.
#
# Idempotent: by default, if the anchor program already exists the domain
# block is skipped (re-runs won't duplicate). Use -Reset to wipe domain
# tables (via sqlcmd) and re-seed from scratch. Accounts are always 409-safe.
#
# Usage (from repo root, API running on https://localhost:5001):
#   powershell -ExecutionPolicy Bypass -File tests\seed-sample-data.ps1
#   powershell -ExecutionPolicy Bypass -File tests\seed-sample-data.ps1 -Reset
# ============================================================

param(
    [string]$ApiBase   = "https://localhost:5001",
    [string]$AdminUser = "admin",
    [string]$AdminPass = "Admin@123",
    [switch]$Reset,
    [string]$Term      = "2026-Fall"
)

$ErrorActionPreference = "Stop"

# --- Accept the local dev certificate (self-signed) in Windows PowerShell 5.1 ---
if (-not ("TrustAllCertsPolicy" -as [type])) {
    Add-Type @"
using System.Net;
using System.Security.Cryptography.X509Certificates;
public class TrustAllCertsPolicy : ICertificatePolicy {
    public bool CheckValidationResult(ServicePoint sp, X509Certificate cert, WebRequest req, int problem) { return true; }
}
"@
}
[System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCertsPolicy
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

function Write-Step($m) { Write-Host "==> $m" -ForegroundColor Cyan }
function Write-Ok($m)   { Write-Host "    OK  $m" -ForegroundColor Green }
function Write-Skip($m) { Write-Host "    --  $m" -ForegroundColor Yellow }
function Write-Err($m)  { Write-Host "    ERR $m" -ForegroundColor Red }

# --- Generic API call: always returns @{ ok; status; data; error } ----------
function Api {
    param([string]$Method, [string]$Path, [string]$Token, $Body)
    $headers = @{}
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    $uri = "$ApiBase$Path"
    $json = $null
    if ($null -ne $Body) { $json = ($Body | ConvertTo-Json -Depth 10) }
    try {
        if ($json) {
            $data = Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType "application/json" -Body $json -ErrorAction Stop
        } else {
            $data = Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ErrorAction Stop
        }
        return @{ ok = $true; status = 200; data = $data; error = "" }
    } catch {
        $status = 0; $bodyText = ""
        $resp = $_.Exception.Response
        if ($resp) {
            try { $status = [int]$resp.StatusCode } catch {}
            try {
                $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
                $bodyText = $sr.ReadToEnd(); $sr.Close()
            } catch {}
        }
        if (-not $bodyText) { $bodyText = $_.Exception.Message }
        return @{ ok = $false; status = $status; data = $null; error = $bodyText }
    }
}

# --- Create helper: returns created id (from $idField) or $null --------------
function New-Entity {
    param([string]$Desc, [string]$Method, [string]$Path, [string]$Token, $Body, [string]$IdField)
    $r = Api -Method $Method -Path $Path -Token $Token -Body $Body
    if ($r.ok) {
        $id = $null
        if ($IdField -and $r.data) { $id = $r.data.$IdField; if (-not $id) { $id = $r.data.id } }
        Write-Ok ("{0}{1}" -f $Desc, $(if ($id) { " (id=$id)" } else { "" }))
        return $id
    } elseif ($r.status -eq 409) {
        Write-Skip "$Desc already exists"
        return $null
    } else {
        Write-Err "$Desc [HTTP $($r.status)]: $($r.error)"
        return $null
    }
}

function Get-Token($user, $pass) {
    $r = Api -Method Post -Path "/api/auth/login" -Body @{ usernameOrEmail = $user; password = $pass }
    if ($r.ok -and $r.data.token) { return $r.data.token }
    Write-Err "Login failed for '$user' [HTTP $($r.status)]: $($r.error)"
    return $null
}

# ============================================================
# 0. Optional reset (sqlcmd) - wipe domain tables, keep Users
# ============================================================
if ($Reset) {
    Write-Step "Resetting domain tables (sqlcmd) - accounts are preserved"
    $del = @(
        'GradeChanges','PlagiarismReports','Payments','Invoices','Scholarships','FeeSchedules',
        'Submissions','Contents','Assessments','Enrollments','Transcripts','Sections',
        'Students','Rooms','Courses','Programs','Applicants','Notifications','Tickets','Discussions','Syllabi'
    ) | ForEach-Object { "IF OBJECT_ID('$_','U') IS NOT NULL DELETE FROM [$_];" }
    # Disable ALL FK constraints during the wipe so table delete-order/FK cycles
    # can never block a delete (the earlier ordered-delete left Courses populated
    # because Syllabi->Courses is deleted after Courses). Re-enable afterwards.
    $sql = "SET NOCOUNT ON; EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'; " + ($del -join ' ') + " EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';"
    try {
        sqlcmd -S '(localdb)\MSSQLLocalDB' -d EduLearnDb -b -Q $sql | Out-Null
        Write-Ok "Domain tables cleared"
    } catch {
        Write-Err "Reset failed (continuing): $($_.Exception.Message)"
    }
}

# ============================================================
# 1. Log in as admin
# ============================================================
Write-Step "Logging in as '$AdminUser' at $ApiBase"
$adminTok = Get-Token $AdminUser $AdminPass
if (-not $adminTok) { Write-Err "Cannot continue without admin token."; exit 1 }
Write-Ok "Admin authenticated"

# ============================================================
# 2. Ensure all login accounts (idempotent via 409)
# ============================================================
Write-Step "Ensuring login accounts (POST /api/users)"
$accounts = @(
    @{ Username="student";     FullName="Test Student";    Email="student@edulearn.local";     Role="Student";    Password="Student@123"  },
    @{ Username="instructor";  FullName="Test Instructor"; Email="instructor@edulearn.local";  Role="Instructor"; Password="Instructor@123" },
    @{ Username="registrar";   FullName="Test Registrar";  Email="registrar@edulearn.local";   Role="Registrar";  Password="Registrar@123" },
    @{ Username="deptadmin";   FullName="Test Dept Admin"; Email="deptadmin@edulearn.local";   Role="DeptAdmin";  Password="DeptAdmin@123" },
    @{ Username="finance";     FullName="Test Finance";    Email="finance@edulearn.local";     Role="Finance";    Password="Finance@123"   },
    @{ Username="auditor";     FullName="Test Auditor";    Email="auditor@edulearn.local";     Role="Auditor";    Password="Auditor@123"   },
    @{ Username="student2";    FullName="Aarav Sharma";    Email="student2@edulearn.local";    Role="Student";    Password="Student@123"  },
    @{ Username="student3";    FullName="Diya Patel";      Email="student3@edulearn.local";    Role="Student";    Password="Student@123"  },
    @{ Username="student4";    FullName="Rohan Mehta";     Email="student4@edulearn.local";    Role="Student";    Password="Student@123"  },
    @{ Username="instructor2"; FullName="Meera Iyer";      Email="instructor2@edulearn.local"; Role="Instructor"; Password="Instructor@123" }
)
foreach ($a in $accounts) {
    New-Entity -Desc "$($a.Role) / $($a.Username)" -Method Post -Path "/api/users" -Token $adminTok -IdField "userID" -Body @{
        username = $a.Username; fullName = $a.FullName; email = $a.Email; role = $a.Role; password = $a.Password; sendInvite = $false
    } | Out-Null
}

# ============================================================
# 3. Resolve username -> userID map (handles new + pre-existing)
# ============================================================
Write-Step "Resolving user IDs (GET /api/users)"
$uResp = Api -Method Get -Path "/api/users?pageSize=200" -Token $adminTok
if (-not $uResp.ok) { $uResp = Api -Method Get -Path "/api/users" -Token $adminTok }
if (-not $uResp.ok) { Write-Err "Failed to fetch users: $($uResp.error)"; exit 1 }
$rawUsers = $uResp.data
# API may return direct array OR {items:[...]} OR {data:[...]} - extract properly
if ($rawUsers -and -not ($rawUsers -is [Array])) {
    if ($rawUsers.PSObject.Properties.Name -contains 'items') { $rawUsers = $rawUsers.items }
    elseif ($rawUsers.PSObject.Properties.Name -contains 'data') { $rawUsers = $rawUsers.data }
}
if (-not $rawUsers -or $rawUsers.Count -eq 0) { Write-Err "No users returned"; exit 1 }
$global:UserMap = @{}
foreach ($urow in $rawUsers) {
    $uid = $urow.userID; if (-not $uid) { $uid = $urow.id }
    if ($urow.username -and $uid) { $global:UserMap[([string]$urow.username).ToLower()] = $uid }
}
function UID($name) { $n = $name.ToLower(); if ($global:UserMap.ContainsKey($n)) { return $global:UserMap[$n] } else { return $null } }
$adminId = UID 'admin'; $instrId = UID 'instructor'; $studId = UID 'student'
Write-Ok "Mapped $($global:UserMap.Count) users (admin=$adminId, instructor=$instrId, student=$studId)"
if (-not $studId -or -not $instrId) { Write-Err "Missing core user IDs - cannot seed domain data."; exit 1 }

# Tokens for role-gated creates
$regTok = Get-Token "registrar" "Registrar@123"
$finTok = Get-Token "finance"   "Finance@123"
$stuTok = Get-Token "student"   "Student@123"

# ============================================================
# 4. Idempotency anchor - skip domain block if already seeded
# ============================================================
$ANCHOR = "B.Tech Computer Science"
$progResp = Api -Method Get -Path "/api/programs" -Token $adminTok
$progList = $progResp.data; if ($progList.items) { $progList = $progList.items }
$already = $false
foreach ($p in $progList) { if ($p.name -eq $ANCHOR) { $already = $true; break } }
if ($already -and -not $Reset) {
    Write-Skip "Anchor program '$ANCHOR' already present - domain data already seeded."
    Write-Skip "Re-run with -Reset to wipe and rebuild domain data."
    Write-Host ""
    Write-Host "Login accounts are ready. See credentials table below." -ForegroundColor White
} else {

# ============================================================
# 5. Programs (admin)
# ============================================================
Write-Step "Programs"
$P1 = New-Entity "Program: B.Tech Computer Science" Post "/api/programs" $adminTok @{ name="B.Tech Computer Science"; degreeType="B.Tech"; durationTerms=8 } "programID"
$P2 = New-Entity "Program: B.Tech Electrical Engineering" Post "/api/programs" $adminTok @{ name="B.Tech Electrical Engineering"; degreeType="B.Tech"; durationTerms=8 } "programID"
# Resolve program IDs by name so 409-existing programs never leave null IDs
$pResp = Api -Method Get -Path "/api/programs" -Token $adminTok
$pRows = $pResp.data
if ($pRows -isnot [System.Array] -and $pRows.items) { $pRows = $pRows.items }
$PMAP = @{}
foreach ($pr in $pRows) { if ($pr.name) { $PMAP[[string]$pr.name] = $pr.programID } }
if ($PMAP['B.Tech Computer Science'])      { $P1 = $PMAP['B.Tech Computer Science'] }
if ($PMAP['B.Tech Electrical Engineering']) { $P2 = $PMAP['B.Tech Electrical Engineering'] }
Write-Ok "Resolved program IDs: P1=$P1 P2=$P2"

# ============================================================
# 6. Courses (admin) - incl. a prerequisite chain
# ============================================================
Write-Step "Courses"
$C1 = New-Entity "Course: CS101" Post "/api/courses" $adminTok @{ code="CS101"; title="Introduction to Programming"; credits=4; level="100"; description="Foundations of programming." } "courseID"
$C2 = New-Entity "Course: CS201" Post "/api/courses" $adminTok @{ code="CS201"; title="Data Structures"; credits=4; level="200"; prerequisitesJSON="[$C1]" } "courseID"
$C3 = New-Entity "Course: CS301" Post "/api/courses" $adminTok @{ code="CS301"; title="Algorithms"; credits=3; level="300"; prerequisitesJSON="[$C2]" } "courseID"
$C4 = New-Entity "Course: EE101" Post "/api/courses" $adminTok @{ code="EE101"; title="Circuit Theory"; credits=4; level="100" } "courseID"
$C5 = New-Entity "Course: MA101" Post "/api/courses" $adminTok @{ code="MA101"; title="Calculus I"; credits=3; level="100" } "courseID"
$C6 = New-Entity "Course: CS210" Post "/api/courses" $adminTok @{ code="CS210"; title="Databases"; credits=3; level="200" } "courseID"
# Resolve course IDs by code so a pre-existing course (409 -> null id) never
# leaves a downstream section/assessment/content with a null courseID.
$cResp = Api -Method Get -Path "/api/courses" -Token $adminTok
$cRows = $cResp.data
if ($cRows -isnot [System.Array] -and $cRows.items) { $cRows = $cRows.items }
$CMAP = @{}
foreach ($crow in $cRows) { if ($crow.code) { $CMAP[[string]$crow.code] = $crow.courseID } }
if ($CMAP['CS101']) { $C1 = $CMAP['CS101'] }
if ($CMAP['CS201']) { $C2 = $CMAP['CS201'] }
if ($CMAP['CS301']) { $C3 = $CMAP['CS301'] }
if ($CMAP['EE101']) { $C4 = $CMAP['EE101'] }
if ($CMAP['MA101']) { $C5 = $CMAP['MA101'] }
if ($CMAP['CS210']) { $C6 = $CMAP['CS210'] }
Write-Ok "Resolved course IDs: CS101=$C1 CS201=$C2 CS301=$C3 EE101=$C4 MA101=$C5 CS210=$C6"

# ============================================================
# 7. Rooms (admin)
# ============================================================
Write-Step "Rooms"
$R1 = New-Entity "Room: Main-101" Post "/api/rooms" $adminTok @{ building="Main"; roomNumber="101"; capacity=60; resourcesJSON='{"projector":true}' } "roomID"
$R2 = New-Entity "Room: Main-102" Post "/api/rooms" $adminTok @{ building="Main"; roomNumber="102"; capacity=40 } "roomID"
$R3 = New-Entity "Room: Science-201" Post "/api/rooms" $adminTok @{ building="Science"; roomNumber="201"; capacity=30; resourcesJSON='{"lab":true}' } "roomID"

# ============================================================
# 8. Students (admin) - each links a User(role=Student) by userID
# ============================================================
Write-Step "Students"
$studentDefs = @(
    @{ user="student";  name="Test Student"; dob="2004-03-12"; gender="Male";              prog=$P1 },
    @{ user="student2"; name="Aarav Sharma"; dob="2004-07-22"; gender="Male";              prog=$P1 },
    @{ user="student3"; name="Diya Patel";   dob="2005-01-09"; gender="Female";            prog=$P1 },
    @{ user="student4"; name="Rohan Mehta";  dob="2003-11-30"; gender="Prefer not to say"; prog=$P2 }
)
$S = @{}
foreach ($sd in $studentDefs) {
    $sid = New-Entity "Student: $($sd.name)" Post "/api/students" $adminTok @{
        userID=(UID $sd.user); name=$sd.name; dob=$sd.dob; gender=$sd.gender;
        contactInfoJSON=$null; programID=$sd.prog; entryTerm=$Term; expectedGraduationTerm="2030-Spring"
    } "studentID"
    if ($sid) { $S[$sd.user] = $sid }
}
# Resolve student IDs by userID so 409-existing students never leave null IDs
$stResp = Api -Method Get -Path "/api/students" -Token $adminTok
$stRows = $stResp.data
if ($stRows -isnot [System.Array] -and $stRows.items) { $stRows = $stRows.items }
foreach ($st in $stRows) {
    $stUID = $st.userID; if (-not $stUID) { $stUID = $st.UserID }
    $stSID = $st.studentID; if (-not $stSID) { $stSID = $st.StudentID }
    foreach ($sd in $studentDefs) {
        if ($stUID -eq (UID $sd.user) -and -not $S[$sd.user]) {
            $S[$sd.user] = $stSID
        }
    }
}
Write-Ok "Resolved student IDs: student=$($S['student']) student2=$($S['student2']) student3=$($S['student3']) student4=$($S['student4'])"

# ============================================================
# 9. Sections (admin) - instructorID must be an Instructor user
# ============================================================
Write-Step "Sections"
$instr1 = UID 'instructor'; $instr2 = UID 'instructor2'
$Sec1 = New-Entity "Section: CS101" Post "/api/sections" $adminTok @{ courseID=$C1; term=$Term; instructorID=$instr1; roomID=$R1; capacity=60; scheduleJSON='{"days":"Mon-Wed","time":"09:00-10:30"}' } "sectionID"
$Sec2 = New-Entity "Section: CS201" Post "/api/sections" $adminTok @{ courseID=$C2; term=$Term; instructorID=$instr1; roomID=$R2; capacity=40; scheduleJSON='{"days":"Tue-Thu","time":"11:00-12:30"}' } "sectionID"
$Sec3 = New-Entity "Section: EE101" Post "/api/sections" $adminTok @{ courseID=$C4; term=$Term; instructorID=$instr2; roomID=$R3; capacity=30; scheduleJSON='{"days":"Mon-Wed","time":"09:00-10:30"}' } "sectionID"
$Sec4 = New-Entity "Section: MA101 (small)" Post "/api/sections" $adminTok @{ courseID=$C5; term=$Term; instructorID=$instr2; roomID=$R2; capacity=2;  scheduleJSON='{"days":"Fri","time":"14:00-16:00"}' } "sectionID"
$Sec5 = New-Entity "Section: CS210" Post "/api/sections" $adminTok @{ courseID=$C6; term=$Term; instructorID=$instr1; roomID=$R1; capacity=60; scheduleJSON='{"days":"Thu","time":"13:00-15:00"}' } "sectionID"
# Resolve section IDs by courseID+term so 409-existing sections never leave null IDs
$secResp = Api -Method Get -Path "/api/sections" -Token $adminTok
$secRows = $secResp.data
if ($secRows -isnot [System.Array] -and $secRows.items) { $secRows = $secRows.items }
$SECMAP = @{}
foreach ($sr in $secRows) {
    $sCid = $sr.courseID; if (-not $sCid) { $sCid = $sr.CourseID }
    $sSid = $sr.sectionID; if (-not $sSid) { $sSid = $sr.SectionID }
    $sTerm = $sr.term; if (-not $sTerm) { $sTerm = $sr.Term }
    if ($sCid -and $sSid -and $sTerm -eq $Term) { $SECMAP[[string]$sCid] = $sSid }
}
if ($SECMAP[[string]$C1] -and -not $Sec1) { $Sec1 = $SECMAP[[string]$C1] }
if ($SECMAP[[string]$C2] -and -not $Sec2) { $Sec2 = $SECMAP[[string]$C2] }
if ($SECMAP[[string]$C4] -and -not $Sec3) { $Sec3 = $SECMAP[[string]$C4] }
if ($SECMAP[[string]$C5] -and -not $Sec4) { $Sec4 = $SECMAP[[string]$C5] }
if ($SECMAP[[string]$C6] -and -not $Sec5) { $Sec5 = $SECMAP[[string]$C6] }
Write-Ok "Resolved section IDs: CS101=$Sec1 CS201=$Sec2 EE101=$Sec3 MA101=$Sec4 CS210=$Sec5"

# ============================================================
# 10. Enrollments (admin) - multiple students x sections, plus a drop
# ============================================================
Write-Step "Enrollments"
function Enroll($studKey, $secId, $label) {
    if (-not $S[$studKey] -or -not $secId) { return $null }
    return New-Entity "Enroll $($studKey) -> $label" Post "/api/enrollment/enroll" $adminTok @{ studentID=$S[$studKey]; sectionID=$secId } "enrollID"
}
Enroll "student"  $Sec1 "CS101" | Out-Null
Enroll "student"  $Sec2 "CS201" | Out-Null
Enroll "student"  $Sec5 "CS210" | Out-Null
Enroll "student2" $Sec1 "CS101" | Out-Null
$dropId = Enroll "student2" $Sec4 "MA101"
Enroll "student3" $Sec2 "CS201" | Out-Null
Enroll "student4" $Sec3 "EE101" | Out-Null
if ($dropId) {
    $d = Api -Method Delete -Path "/api/enrollment/$dropId/drop" -Token $adminTok
    if ($d.ok -or $d.status -eq 204) { Write-Ok "Dropped enrollment $dropId (student2 -> MA101)" } else { Write-Err "Drop failed [HTTP $($d.status)]: $($d.error)" }
}

# ============================================================
# 11. Assessments (admin, createdByFK=instructor) - Draft + Published
# ============================================================
Write-Step "Assessments"
$A1 = New-Entity "Assessment: CS101 Quiz 1" Post "/api/assessments" $adminTok @{ courseID=$C1; sectionID=$Sec1; title="CS101 Quiz 1"; type="Quiz"; dueAt="2026-10-01T23:59:00Z"; maxScore=50; createdByFK=$instr1 } "assessmentID"
$A2 = New-Entity "Assessment: CS101 Assignment 1" Post "/api/assessments" $adminTok @{ courseID=$C1; sectionID=$Sec1; title="CS101 Assignment 1"; type="Assignment"; dueAt="2026-10-15T23:59:00Z"; maxScore=100; createdByFK=$instr1; instructionsURI="https://lms.example/cs101-a1" } "assessmentID"
$A3 = New-Entity "Assessment: CS201 Midterm" Post "/api/assessments" $adminTok @{ courseID=$C2; sectionID=$Sec2; title="CS201 Midterm"; type="Exam"; dueAt="2026-11-01T23:59:00Z"; maxScore=100; createdByFK=$instr1 } "assessmentID"
$A4 = New-Entity "Assessment: EE101 Quiz (Draft)" Post "/api/assessments" $adminTok @{ courseID=$C4; sectionID=$Sec3; title="EE101 Quiz 1"; type="Quiz"; dueAt="2026-10-20T23:59:00Z"; maxScore=30; createdByFK=$instr2 } "assessmentID"
# Publish A1, A2, A3 (leave A4 Draft for lifecycle testing)
foreach ($pair in @(@($A1,"CS101 Quiz 1"), @($A2,"CS101 Assignment 1"), @($A3,"CS201 Midterm"))) {
    if ($pair[0]) {
        $pr = Api -Method Put -Path "/api/assessments/$($pair[0])/publish" -Token $adminTok -Body @{ status="Published" }
        if ($pr.ok) { Write-Ok "Published: $($pair[1])" } else { Write-Err "Publish '$($pair[1])' [HTTP $($pr.status)]: $($pr.error)" }
    }
}

# ============================================================
# 12. Content (admin, uploadedByFK=instructor)
# ============================================================
Write-Step "Content"
New-Entity "Content: CS101 Week 1 Notes" Post "/api/content/upload" $adminTok @{ courseID=$C1; title="CS101 Week 1 Notes"; type="Document"; uri="https://lms.example/cs101/w1.pdf"; uploadedByFK=$instr1; metadataJSON='{"size":1024}' } "contentID" | Out-Null
New-Entity "Content: CS101 Lecture 1 Video" Post "/api/content/upload" $adminTok @{ courseID=$C1; title="CS101 Lecture 1"; type="Video"; uri="https://lms.example/cs101/l1.mp4"; uploadedByFK=$instr1 } "contentID" | Out-Null
New-Entity "Content: CS201 Reading List" Post "/api/content/upload" $adminTok @{ courseID=$C2; title="CS201 Reading List"; type="Link"; uri="https://lms.example/cs201/readings"; uploadedByFK=$instr1 } "contentID" | Out-Null

# ============================================================
# 13. Submissions (student posts as themselves) + grading
# ============================================================
Write-Step "Submissions"
# Students must POST submissions as themselves (not admin on their behalf)
$sub1 = $null; $sub2 = $null; $sub3 = $null
if ($stuTok -and $A1) {
    $r = Api -Method Post -Path "/api/submissions" -Token $stuTok -Body @{ assessmentID=$A1; studentID=$S["student"]; fileURI="https://lms.example/sub/student-$A1.pdf" }
    if ($r.ok) { $sub1 = $r.data.submissionID; Write-Ok "Submit student -> CS101 Quiz 1 (id=$sub1)" } else { Write-Err "Submit student -> CS101 Quiz 1 [HTTP $($r.status)]: $($r.error)" }
}
if ($stuTok -and $A2) {
    $r = Api -Method Post -Path "/api/submissions" -Token $stuTok -Body @{ assessmentID=$A2; studentID=$S["student"]; fileURI="https://lms.example/sub/student-$A2.pdf" }
    if ($r.ok) { $sub2 = $r.data.submissionID; Write-Ok "Submit student -> CS101 Assignment 1 (id=$sub2)" } else { Write-Err "Submit student -> CS101 Assignment 1 [HTTP $($r.status)]: $($r.error)" }
}
$stu2Tok = Get-Token "student2" "Student@123"
if ($stu2Tok -and $A1) {
    $r = Api -Method Post -Path "/api/submissions" -Token $stu2Tok -Body @{ assessmentID=$A1; studentID=$S["student2"]; fileURI="https://lms.example/sub/student2-$A1.pdf" }
    if ($r.ok) { $sub3 = $r.data.submissionID; Write-Ok "Submit student2 -> CS101 Quiz 1 (id=$sub3)" } else { Write-Err "Submit student2 -> CS101 Quiz 1 [HTTP $($r.status)]: $($r.error)" }
}
# Grade sub1 and sub3 (instructor grades them)
$instrTok = Get-Token "instructor" "Instructor@123"
foreach ($g in @(@($sub1,42,"CS101 Quiz 1 (student)"), @($sub3,38,"CS101 Quiz 1 (student2)"))) {
    if ($g[0] -and $instrTok) {
        $gr = Api -Method Post -Path "/api/submissions/$($g[0])/grade" -Token $instrTok -Body @{ score=$g[1]; graderID=$instr1; reason="Graded by seed" }
        if ($gr.ok) { Write-Ok "Graded: $($g[2]) = $($g[1])" } else { Write-Err "Grade '$($g[2])' [HTTP $($gr.status)]: $($gr.error)" }
    }
}

# ============================================================
# 14. Applicants (registrar) - one advanced to Accepted
# ============================================================
Write-Step "Applicants"
$ap1 = New-Entity "Applicant: Kabir Nair" Post "/api/applicants" $regTok @{ name="Kabir Nair"; dob="2006-02-18"; nationalId="NAT-1001"; contactInfoJSON='{"email":"kabir@example.com"}'; programApplied="B.Tech Computer Science" } "applicantID"
$ap2 = New-Entity "Applicant: Sara Khan" Post "/api/applicants" $regTok @{ name="Sara Khan"; dob="2006-05-04"; nationalId="NAT-1002"; programApplied="B.Tech Electrical Engineering" } "applicantID"
if ($ap1) {
    $t1 = Api -Method Put -Path "/api/applicants/$ap1/status" -Token $regTok -Body @{ status="UnderReview" }
    if ($t1.ok) { Write-Ok "Applicant Kabir -> UnderReview" } else { Write-Err "Status UnderReview [HTTP $($t1.status)]: $($t1.error)" }
    $t2 = Api -Method Put -Path "/api/applicants/$ap1/status" -Token $regTok -Body @{ status="Accepted" }
    if ($t2.ok) { Write-Ok "Applicant Kabir -> Accepted" } else { Write-Err "Status Accepted [HTTP $($t2.status)]: $($t2.error)" }
}

# ============================================================
# 15. Fees (finance) - one schedule per (program, term)
# ============================================================
Write-Step "Fees"
$feeItems = '[{"item":"Tuition","amount":50000},{"item":"Lab","amount":5000}]'
New-Entity "Fee: CS program $Term" Post "/api/fees" $finTok @{ programID=$P1; term=$Term; feeItemsJSON=$feeItems; effectiveFrom="2026-01-01"; effectiveTo="2026-12-31" } "feeID" | Out-Null
New-Entity "Fee: EE program $Term" Post "/api/fees" $finTok @{ programID=$P2; term=$Term; feeItemsJSON=$feeItems; effectiveFrom="2026-01-01"; effectiveTo="2026-12-31" } "feeID" | Out-Null

# ============================================================
# 16. Scholarships (finance) - validFrom in the past so it applies
# ============================================================
Write-Step "Scholarships"
if ($S["student"]) {
    New-Entity "Scholarship: Merit (student)" Post "/api/scholarships" $finTok @{ studentID=$S["student"]; awardType="Merit"; amount=10000; validFrom="2026-01-01"; validTo="2026-12-31" } "scholarshipID" | Out-Null
}

# ============================================================
# 17. Invoices (finance) - term matches fees + active scholarships
# ============================================================
Write-Step "Invoices"
$INV = @{}
foreach ($sk in @("student","student2","student4")) {
    if ($S[$sk]) {
        $r = Api -Method Post -Path "/api/invoices/generate" -Token $finTok -Body @{ studentID=$S[$sk]; term=$Term; dueDate="2026-08-15" }
        if ($r.ok) { $INV[$sk] = $r.data.invoiceID; Write-Ok "Invoice $sk (id=$($r.data.invoiceID), amountDue=$($r.data.amountDue))" }
        else { Write-Err "Invoice $sk [HTTP $($r.status)]: $($r.error)" }
    }
}

# ============================================================
# 18. Payments (finance) - one full, one partial
# ============================================================
Write-Step "Payments"
if ($INV["student"])  { New-Entity "Payment: student full"     Post "/api/payments" $finTok @{ invoiceID=$INV["student"];  amount=45000; method="BankTransfer"; reference="TXN-SEED-1" } "paymentID" | Out-Null }
if ($INV["student2"]) { New-Entity "Payment: student2 partial" Post "/api/payments" $finTok @{ invoiceID=$INV["student2"]; amount=20000; method="Card";         reference="TXN-SEED-2" } "paymentID" | Out-Null }

# ============================================================
# 19. Notifications (admin /test)
# ============================================================
Write-Step "Notifications"
New-Entity "Notification -> student"    Post "/api/notifications/test" $adminTok @{ userID=(UID 'student');    category="System";     severity="Info";    message="Welcome to EduLearn (seed)." } "notificationID" | Out-Null
New-Entity "Notification -> instructor" Post "/api/notifications/test" $adminTok @{ userID=(UID 'instructor'); category="Assessment"; severity="Warning"; message="Grading window opens soon (seed)." } "notificationID" | Out-Null

# ============================================================
# 20. Tickets (student creates; admin assigns + resolves)
# ============================================================
Write-Step "Tickets"
$tk1 = $null
if ($stuTok) { $tk1 = New-Entity "Ticket: portal access" Post "/api/tickets" $stuTok @{ subject="Cannot open Timetable"; description="Timetable page shows nothing for 2026-Fall."; priority="High" } "ticketID" }
if ($tk1) {
    $as = Api -Method Put -Path "/api/tickets/$tk1/assign" -Token $adminTok -Body @{ assignedToUserId=(UID 'admin') }
    if ($as.ok) { Write-Ok "Ticket $tk1 assigned to admin" } else { Write-Err "Assign [HTTP $($as.status)]: $($as.error)" }
    $rs = Api -Method Put -Path "/api/tickets/$tk1/resolve" -Token $adminTok -Body @{ resolutionURI="https://kb.example/timetable"; resolutionNote="Cleared cache; resolved." }
    if ($rs.ok) { Write-Ok "Ticket $tk1 resolved" } else { Write-Err "Resolve [HTTP $($rs.status)]: $($rs.error)" }
}

# ============================================================
# 21. Transcripts (registrar) - generate for 2, publish 1
# ============================================================
Write-Step "Transcripts"
foreach ($sk in @("student","student2")) {
    if ($S[$sk]) {
        $tr = Api -Method Post -Path "/api/transcripts/generate/$($S[$sk])" -Token $regTok -Body @{}
        if ($tr.ok) {
            $tid = $tr.data.transcriptID
            Write-Ok "Transcript $sk (id=$tid)"
            if ($sk -eq "student" -and $tid) {
                $pub = Api -Method Put -Path "/api/transcripts/$tid/publish" -Token $regTok -Body @{}
                if ($pub.ok) { Write-Ok "Transcript $sk published" } else { Write-Err "Publish transcript [HTTP $($pub.status)]: $($pub.error)" }
            }
        } else { Write-Err "Transcript $sk [HTTP $($tr.status)]: $($tr.error)" }
    }
}

} # end domain block

# ============================================================
# Credentials summary
# ============================================================
Write-Host ""
Write-Host "============================================================" -ForegroundColor White
Write-Host " EduLearn manual-test accounts (MFA disabled, direct login)" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor White
Write-Host (" {0,-12} {1,-12} {2}" -f "ROLE","USERNAME","PASSWORD") -ForegroundColor White
Write-Host " ITAdmin      admin        Admin@123"
Write-Host " Student      student      Student@123   (enrolled, graded, invoiced, transcript)"
Write-Host " Student      student2     Student@123"
Write-Host " Student      student3     Student@123"
Write-Host " Student      student4     Student@123   (EE program)"
Write-Host " Instructor   instructor   Instructor@123"
Write-Host " Instructor   instructor2  Instructor@123"
Write-Host " Registrar    registrar    Registrar@123"
Write-Host " DeptAdmin    deptadmin    DeptAdmin@123"
Write-Host " Finance      finance      Finance@123"
Write-Host " Auditor      auditor      Auditor@123"
Write-Host "============================================================" -ForegroundColor White
Write-Host " Frontend: http://localhost:5173/login   Swagger: $ApiBase/swagger" -ForegroundColor White
Write-Host " Term seeded: $Term" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor White
