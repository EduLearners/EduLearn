import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { enrollmentService } from '../../services/enrollmentService';
import { submissionService } from '../../services/submissionService';
import { notificationService } from '../../services/notificationService';
import { transcriptService } from '../../services/transcriptService';
import Loading from '../Loading';
import axiosClient from '../../api/axiosClient';

const TERM = '2026-Spring';

function CountUp({ target, duration = 600, delay = 200 }) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (target == null || target === 0) { setCount(target === 0 ? 0 : 0); return; }
        const t = setTimeout(() => {
            const start = performance.now();
            const animate = (now) => {
                const p = Math.min((now - start) / duration, 1);
                setCount(Math.round((1 - Math.pow(1 - p, 2.5)) * target));
                if (p < 1) requestAnimationFrame(animate); else setCount(target);
            };
            requestAnimationFrame(animate);
        }, delay);
        return () => clearTimeout(t);
    }, [target, duration, delay]);
    return <>{count}</>;
}

function DonutMini({ value, max, color, size = 70 }) {
    const pct = max > 0 ? value / max : 0;
    const r = 26, circ = 2 * Math.PI * r, cx = size / 2, cy = size / 2;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f0f0" strokeWidth={8} />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={8}
                strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: 'stroke-dasharray 1s ease' }} />
            <text x={cx} y={cy + 4} textAnchor="middle" style={{ fontSize: 13, fontWeight: 700, fill: color }}>{value}</text>
        </svg>
    );
}

function ProgressBar({ pct, color, label, sub }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <div className="d-flex justify-content-between" style={{ fontSize: 12, marginBottom: 4 }}>
                <span style={{ fontWeight: 500, color: '#333' }}>{label}</span>
                <span style={{ color: '#888', fontVariantNumeric: 'tabular-nums' }}>{sub || `${pct}%`}</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: '#f0f0f0', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${color}, ${color}aa)`, width: `${pct}%`, transition: 'width 1s ease' }} />
            </div>
        </div>
    );
}

const S = {
    card: { background: 'white', borderRadius: 14, border: '0.5px solid #e8e8e8', overflow: 'hidden', transition: 'transform 0.15s ease, box-shadow 0.15s ease' },
    ch: { padding: '14px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    ht: { fontSize: 14, fontWeight: 600, color: '#1a3c6e', display: 'flex', alignItems: 'center', gap: 8 },
    va: { fontSize: 12, color: '#185FA5', cursor: 'pointer', textDecoration: 'none', fontWeight: 500 },
};

export default function StudentDashboard() {
    const navigate = useNavigate();
    const { username } = authService.getCurrentUser();
    const [stats, setStats] = useState({});
    const [enrollments, setEnrollments] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const today = new Date();
    const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening';

    useEffect(() => { loadStats(); }, []);

    const loadStats = async () => {
        setLoading(true);
        const s = {};
        try {
            const studentRecord = await axiosClient.get('/students/me').then(r => r.data).catch(() => null);
            const sid = studentRecord?.studentID;
            s.studentName = studentRecord?.name || username;
            s.program = studentRecord?.programName || 'Student';
            if (sid) {
                const [enr, trans, notif, subs] = await Promise.allSettled([
                    enrollmentService.getByStudent(sid),
                    transcriptService.getByStudent(sid),
                    notificationService.getAll({ unreadOnly: true }),
                    submissionService.getByStudent(sid),
                ]);
                if (enr.status === 'fulfilled') {
                    const d = enr.value || [];
                    s.enrolled = d.filter(e => e.status === 'Enrolled').length;
                    s.waitlisted = d.filter(e => e.status === 'Waitlisted').length;
                    s.totalEnrollments = d.length;
                    setEnrollments(d.filter(e => e.status === 'Enrolled').slice(0, 4));
                }
                if (trans.status === 'fulfilled') {
                    const d = trans.value || [];
                    s.cgpa = d.length > 0 ? d[0].gpa : null;
                    s.totalCredits = d.length > 0 ? d[0].totalCredits : 0;
                }
                if (notif.status === 'fulfilled') {
                    const d = notif.value;
                    const items = d?.items || (Array.isArray(d) ? d : []);
                    s.unread = items.length;
                    setNotifications(items.slice(0, 3));
                }
                if (subs.status === 'fulfilled') {
                    const d = subs.value || [];
                    s.pendingSubmissions = d.filter(sub => sub.status === 'Submitted').length;
                    s.totalSubmissions = d.length;
                }
            }
        } catch { }
        setStats(s);
        setLoading(false);
    };

    if (loading) return <Loading message="Loading your dashboard..." />;

    const STAT_CARDS = [
        { label: 'Enrolled Courses', value: stats.enrolled, sub: `${stats.waitlisted || 0} waitlisted`, icon: 'bi-book-fill', color: '#185FA5', bg: 'linear-gradient(135deg, #E6F1FB, #d4e8f8)', to: '/enrollment' },
        { label: 'Submissions', value: stats.pendingSubmissions, sub: 'pending review', icon: 'bi-cloud-upload-fill', color: '#854F0B', bg: 'linear-gradient(135deg, #FAEEDA, #f5e0c0)', to: '/submissions' },
        { label: 'Latest CGPA', value: stats.cgpa != null ? Number(stats.cgpa).toFixed(2) : '\u2014', sub: 'out of 10.00', icon: 'bi-trophy-fill', color: '#27500A', bg: 'linear-gradient(135deg, #EAF3DE, #d8ebc5)', noCount: true, to: '/transcripts' },
        { label: 'Notifications', value: stats.unread, sub: 'unread', icon: 'bi-bell-fill', color: '#A32D2D', bg: 'linear-gradient(135deg, #FCEBEB, #f8d4d4)', to: '/notifications' },
    ];

    const QUICK = [
        { label: 'Enroll', icon: 'bi-card-checklist', to: '/enrollment', color: '#185FA5', bg: '#E6F1FB' },
        { label: 'Timetable', icon: 'bi-calendar3', to: '/timetable', color: '#185FA5', bg: '#E6F1FB' },
        { label: 'Assessments', icon: 'bi-file-earmark-check', to: '/assessments', color: '#27500A', bg: '#EAF3DE' },
        { label: 'Submissions', icon: 'bi-cloud-upload', to: '/submissions', color: '#854F0B', bg: '#FAEEDA' },
        { label: 'Contents', icon: 'bi-collection-play', to: '/contents', color: '#0F6E56', bg: '#E1F5EE' },
        { label: 'Transcripts', icon: 'bi-file-earmark-text', to: '/transcripts', color: '#3C3489', bg: '#EEEDFE' },
        { label: 'Invoices', icon: 'bi-receipt', to: '/invoices', color: '#A32D2D', bg: '#FCEBEB' },
        { label: 'Support', icon: 'bi-headset', to: '/tickets', color: '#185FA5', bg: '#E6F1FB' },
    ];

    const courseColors = ['#185FA5', '#27500A', '#854F0B', '#3C3489'];

    return (
        <div>
            <style>{`
                @keyframes sdF{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
                @keyframes sdScale{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
            `}</style>

            {/* Welcome Banner */}
            <div className="d-flex align-items-center justify-content-between mb-4" style={{
                background: 'linear-gradient(135deg, #1a3c6e 0%, #2a5a9e 60%, #3b7dcc 100%)',
                borderRadius: 16, padding: '24px 28px', color: 'white',
                animation: 'sdF 0.5s ease both', position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                        {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                    <h3 className="mb-1" style={{ fontWeight: 700, fontSize: 24 }}>
                        {greeting}, {stats.studentName || username}!
                    </h3>
                    <p className="mb-0" style={{ opacity: 0.85, fontSize: 14 }}>
                        Always stay updated in your student portal &middot; Term: {TERM}
                    </p>
                </div>
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'right' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto', marginBottom: 4 }}>
                        <i className="bi bi-mortarboard-fill" style={{ fontSize: 28, color: 'white' }} />
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>{stats.program}</div>
                </div>
                {/* Decorative circles */}
                <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                <div style={{ position: 'absolute', bottom: -20, right: 80, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            </div>

            {/* Stat Cards */}
            <div className="row g-3 mb-4">
                {STAT_CARDS.map((s, i) => (
                    <div key={i} className="col-md-3 col-sm-6" style={{ animation: `sdF 0.4s ease ${0.1 + i * 0.08}s both` }}>
                        <div style={{ ...S.card, background: s.bg, cursor: 'pointer', padding: '18px 20px' }}
                            onClick={() => navigate(s.to)}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <span style={{ fontSize: 11, color: s.color, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>{s.label}</span>
                                <div style={{ width: 34, height: 34, borderRadius: 10, background: s.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className={`bi ${s.icon}`} style={{ fontSize: 15, color: s.color }} />
                                </div>
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                                {s.noCount ? s.value : <CountUp target={s.value ?? 0} delay={300 + i * 100} />}
                            </div>
                            <div style={{ fontSize: 11, color: s.color + 'aa', marginTop: 4 }}>{s.sub}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Row 2: Enrolled Courses + Quick Actions */}
            <div className="row g-3 mb-4">
                {/* Enrolled Courses */}
                <div className="col-lg-7" style={{ animation: 'sdF 0.5s ease 0.4s both' }}>
                    <div style={S.card}>
                        <div style={S.ch}>
                            <span style={S.ht}><i className="bi bi-book-fill" />Enrolled Courses</span>
                            <span style={S.va} onClick={() => navigate('/enrollment')}>See all <i className="bi bi-arrow-right" /></span>
                        </div>
                        <div style={{ padding: 16 }}>
                            {enrollments.length === 0 ? (
                                <div className="text-center py-4">
                                    <i className="bi bi-book" style={{ fontSize: 36, color: '#d0d0d0' }} />
                                    <p style={{ color: '#999', fontSize: 13, marginTop: 8 }}>No enrolled courses yet.</p>
                                    <button className="btn btn-sm" style={{ background: '#1a3c6e', color: 'white', borderRadius: 8, border: 'none' }} onClick={() => navigate('/enrollment')}>
                                        <i className="bi bi-plus-lg me-1" />Enroll Now
                                    </button>
                                </div>
                            ) : (
                                <div className="row g-3">
                                    {enrollments.map((e, i) => {
                                        const c = courseColors[i % courseColors.length];
                                        return (
                                            <div key={e.enrollmentID || i} className="col-sm-6" style={{ animation: `sdScale 0.4s ease ${0.5 + i * 0.1}s both` }}>
                                                <div style={{
                                                    background: `linear-gradient(135deg, ${c}12, ${c}08)`,
                                                    border: `1px solid ${c}20`,
                                                    borderRadius: 14, padding: '16px',
                                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                                    cursor: 'pointer',
                                                }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 16px ${c}15`; }}
                                                   onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                                                   onClick={() => navigate('/courses')}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                                        <div style={{ width: 36, height: 36, borderRadius: 10, background: c + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <i className="bi bi-book" style={{ fontSize: 16, color: c }} />
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.courseName || e.courseCode || 'Course'}</div>
                                                            <div style={{ fontSize: 11, color: '#999' }}>{e.sectionName || `Section`}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 10, color: c, fontWeight: 600, background: c + '15', padding: '2px 8px', borderRadius: 6 }}>{e.status}</span>
                                                        <span style={{ fontSize: 11, color: '#999' }}>{e.term || TERM}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="col-lg-5" style={{ animation: 'sdF 0.5s ease 0.5s both' }}>
                    <div style={{ ...S.card, height: '100%' }}>
                        <div style={S.ch}>
                            <span style={S.ht}><i className="bi bi-lightning-charge-fill" />Quick Actions</span>
                        </div>
                        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                            {QUICK.map((q, i) => (
                                <div key={i} style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    padding: '14px 4px', borderRadius: 12, cursor: 'pointer', background: q.bg,
                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                }} onClick={() => navigate(q.to)}
                                   onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'; }}
                                   onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}>
                                    <i className={`bi ${q.icon}`} style={{ fontSize: 20, color: q.color, marginBottom: 4 }} />
                                    <span style={{ fontSize: 10, fontWeight: 600, color: q.color }}>{q.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: Notifications + Academic Progress */}
            <div className="row g-3 mb-4">
                {/* Notifications */}
                <div className="col-lg-5" style={{ animation: 'sdF 0.5s ease 0.55s both' }}>
                    <div style={{ ...S.card, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={S.ch}>
                            <span style={S.ht}><i className="bi bi-bell-fill" />Notifications</span>
                            <span style={S.va} onClick={() => navigate('/notifications')}>See all <i className="bi bi-arrow-right" /></span>
                        </div>
                        <div style={{ flex: 1, padding: 0 }}>
                            {notifications.length === 0 ? (
                                <div className="text-center py-4">
                                    <i className="bi bi-bell" style={{ fontSize: 32, color: '#d0d0d0' }} />
                                    <p style={{ color: '#999', fontSize: 13, marginTop: 8 }}>No new notifications</p>
                                </div>
                            ) : notifications.map((n, i) => (
                                <div key={n.notificationID || i} style={{ padding: '12px 20px', borderBottom: '1px solid #f5f5f5', display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer', transition: 'background 0.15s' }}
                                     onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                     onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                     onClick={() => navigate('/notifications')}>
                                    <div style={{ width: 34, height: 34, borderRadius: 10, background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                                        <i className="bi bi-bell" style={{ fontSize: 14, color: '#185FA5' }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#222', marginBottom: 2 }}>{n.title || 'Notification'}</div>
                                        <div style={{ fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message || ''}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Academic Progress */}
                <div className="col-lg-4" style={{ animation: 'sdF 0.5s ease 0.6s both' }}>
                    <div style={{ ...S.card, height: '100%' }}>
                        <div style={S.ch}>
                            <span style={S.ht}><i className="bi bi-graph-up" />Academic Progress</span>
                        </div>
                        <div style={{ padding: 20 }}>
                            <div className="d-flex align-items-center justify-content-center mb-3">
                                <DonutMini value={stats.enrolled || 0} max={Math.max(stats.totalEnrollments || 1, stats.enrolled || 1)} color="#185FA5" size={80} />
                                <div style={{ marginLeft: 16 }}>
                                    <div style={{ fontSize: 12, color: '#888' }}>Enrolled</div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: '#185FA5' }}>{stats.enrolled || 0}</div>
                                    <div style={{ fontSize: 11, color: '#bbb' }}>courses</div>
                                </div>
                            </div>
                            <ProgressBar label="Course completion" pct={stats.enrolled ? Math.min(Math.round((stats.enrolled / (stats.enrolled + 2)) * 100), 100) : 0} color="#185FA5" />
                            <ProgressBar label="Submissions done" pct={stats.totalSubmissions ? Math.round(((stats.totalSubmissions - (stats.pendingSubmissions || 0)) / stats.totalSubmissions) * 100) : 0} color="#27500A" />
                            <ProgressBar label="CGPA progress" pct={stats.cgpa ? Math.round((stats.cgpa / 10) * 100) : 0} color="#185FA5" sub={stats.cgpa ? `${Number(stats.cgpa).toFixed(2)} / 10` : '\u2014'} />
                        </div>
                    </div>
                </div>

                {/* Schedule / Links */}
                <div className="col-lg-3" style={{ animation: 'sdF 0.5s ease 0.65s both' }}>
                    <div style={{ ...S.card, height: '100%' }}>
                        <div style={S.ch}>
                            <span style={S.ht}><i className="bi bi-calendar3" />Today</span>
                        </div>
                        <div style={{ padding: 16 }}>
                            <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                <div style={{ fontSize: 36, fontWeight: 700, color: '#1a3c6e', lineHeight: 1 }}>{today.getDate()}</div>
                                <div style={{ fontSize: 13, color: '#888' }}>{today.toLocaleDateString('en-US', { weekday: 'long' })}</div>
                                <div style={{ fontSize: 11, color: '#bbb' }}>{today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                            </div>
                            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
                                {[
                                    { label: 'My Timetable', icon: 'bi-calendar3', to: '/timetable' },
                                    { label: 'Discussions', icon: 'bi-chat-square-text', to: '/discussions' },
                                    { label: 'Syllabi', icon: 'bi-file-earmark-ruled', to: '/syllabi' },
                                ].map((l, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer', transition: 'color 0.15s', color: '#666' }}
                                         onClick={() => navigate(l.to)}
                                         onMouseEnter={e => e.currentTarget.style.color = '#185FA5'}
                                         onMouseLeave={e => e.currentTarget.style.color = '#666'}>
                                        <i className={`bi ${l.icon}`} style={{ fontSize: 14 }} />
                                        <span style={{ fontSize: 13, fontWeight: 500 }}>{l.label}</span>
                                        <i className="bi bi-chevron-right" style={{ fontSize: 10, marginLeft: 'auto' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
