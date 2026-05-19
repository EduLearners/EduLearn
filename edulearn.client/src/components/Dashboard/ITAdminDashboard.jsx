import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { userService } from '../../services/userService';
import { studentService } from '../../services/studentService';
import { courseService } from '../../services/courseService';
import { ticketService } from '../../services/ticketService';
import { auditLogService } from '../../services/auditLogService';
import Loading from '../Loading';
import ErrorAlert from '../ErrorAlert';
import axiosClient from '../../api/axiosClient';

const ALL_ROLES = ['Student', 'Instructor', 'Registrar', 'DeptAdmin', 'Finance', 'ITAdmin', 'Auditor'];

function timeAgo(d) {
    if (!d) return '';
    const s = Math.floor((new Date() - new Date(d + 'Z')) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
}

const ACTION_COLORS = {
    LoginSuccess: { bg: '#EAF3DE', color: '#27500A', icon: 'bi-box-arrow-in-right' },
    MFAEnrolled: { bg: '#EEEDFE', color: '#3C3489', icon: 'bi-shield-check' },
    MFAVerifySuccess: { bg: '#E1F5EE', color: '#085041', icon: 'bi-shield-lock' },
    UserCreatedByAdmin: { bg: '#E6F1FB', color: '#0C447C', icon: 'bi-person-plus' },
    UserRegistered: { bg: '#FAEEDA', color: '#633806', icon: 'bi-person-add' },
    default: { bg: '#F1EFE8', color: '#444441', icon: 'bi-activity' },
};

function DonutChart({ data, size = 150 }) {
    const total = data.reduce((a, d) => a + d.value, 0) || 1;
    const r = 52, cx = size / 2, cy = size / 2, sw = 16;
    const circ = 2 * Math.PI * r;
    let off = 0;
    return (
        <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f0f0" strokeWidth={sw} />
            {data.map((d, i) => {
                const dl = (d.value / total) * circ;
                const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={sw} strokeDasharray={dl + ' ' + (circ - dl)} strokeDashoffset={-off} strokeLinecap="round" transform={'rotate(-90 ' + cx + ' ' + cy + ')'} style={{ transition: 'stroke-dasharray 0.8s ease' }} />;
                off += dl;
                return el;
            })}
            <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontSize: 20, fontWeight: 700, fill: '#1a3c6e' }}>{total}</text>
            <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 10, fill: '#999' }}>total</text>
        </svg>
    );
}

function BarChart({ data }) {
    const mx = Math.max(...data.map(d => d.value), 1);
    const [animated, setAnimated] = useState(false);
    useEffect(() => { const t = setTimeout(() => setAnimated(true), 800); return () => clearTimeout(t); }, []);
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 110, padding: '0 8px' }}>
            {data.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: d.color, opacity: animated ? 1 : 0, transition: 'opacity 0.5s ease ' + (1.2 + i * 0.15) + 's' }}>{d.value}</span>
                    <div style={{ width: '100%', maxWidth: 32, borderRadius: '8px 8px 2px 2px', background: 'linear-gradient(180deg, ' + d.color + ', ' + (d.colorEnd || d.color + '88') + ')', height: animated ? Math.max((d.value / mx) * 80, 6) + 'px' : '0px', transition: 'height 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) ' + (i * 0.2) + 's' }} />
                    <span style={{ fontSize: 9, color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 48 }}>{d.label}</span>
                </div>
            ))}
        </div>
    );
}

function ProgressBar({ pct, color, label }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <div className="d-flex justify-content-between" style={{ fontSize: 12, marginBottom: 4 }}>
                <span style={{ fontWeight: 500, color: '#333' }}>{label}</span>
                <span style={{ color: '#888', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
            </div>
            <div style={{ height: 7, borderRadius: 4, background: '#f0f0f0', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, ' + color + ', ' + color + '99)', width: pct + '%', transition: 'width 0.8s ease' }} />
            </div>
        </div>
    );
}

const S = {
    card: { background: 'white', borderRadius: 14, border: '0.5px solid #e8e8e8', overflow: 'hidden', transition: 'transform 0.15s ease, box-shadow 0.15s ease' },
    cardHover: { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' },
    ch: { padding: '14px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    ht: { fontSize: 14, fontWeight: 600, color: '#1a3c6e', display: 'flex', alignItems: 'center', gap: 8 },
    va: { fontSize: 12, color: '#185FA5', cursor: 'pointer', textDecoration: 'none', fontWeight: 500 },
};

export default function ITAdminDashboard() {
    const navigate = useNavigate();
    const { username } = authService.getCurrentUser();
    const [stats, setStats] = useState({});
    const [roleCounts, setRoleCounts] = useState([]);
    const [ticketsByPriority, setTicketsByPriority] = useState([]);
    const [openTickets, setOpenTickets] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [saving, setSaving] = useState(false);
    const [createError, setCreateError] = useState(null);
    const [createSuccess, setCreateSuccess] = useState('');
    const [userForm, setUserForm] = useState({ username: '', fullName: '', email: '', phone: '', role: 'Student', password: '' });
    const today = new Date();
    const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening';

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        const s = {};
        try {
            const [users, students, courses, tickets, audit] = await Promise.allSettled([
                userService.getAll(), studentService.getAll(), courseService.getAll(), ticketService.getAll(), auditLogService.getAll({ limit: 8 }),
            ]);
            if (users.status === 'fulfilled') {
                const d = users.value || [];
                s.users = d.length;
                const rc = {};
                d.forEach(u => { rc[u.role] = (rc[u.role] || 0) + 1; });
                const rC = { Student: '#185FA5', Instructor: '#27500A', Registrar: '#3C3489', DeptAdmin: '#854F0B', Finance: '#0F6E56', ITAdmin: '#791F1F', Auditor: '#993C1D' };
                const rE = { Student: '#85B7EB', Instructor: '#97C459', Registrar: '#AFA9EC', DeptAdmin: '#FAC775', Finance: '#5DCAA5', ITAdmin: '#F09595', Auditor: '#F0997B' };
                setRoleCounts(Object.entries(rc).map(([k, v]) => ({ label: k, value: v, color: rC[k] || '#888', colorEnd: rE[k] || '#ccc' })));
            }
            if (students.status === 'fulfilled') { const d = students.value || []; s.students = d.length; s.activeStudents = d.filter(st => st.enrollmentStatus === 'Active').length; }
            if (courses.status === 'fulfilled') s.courses = (courses.value || []).length;
            if (tickets.status === 'fulfilled') {
                const d = tickets.value || [];
                const open = d.filter(t => t.status === 'Open' || t.status === 'InProgress');
                s.openTickets = open.length; s.resolvedTickets = d.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
                s.highPriority = open.filter(t => t.priority === 'High' || t.priority === 'Critical').length;
                setOpenTickets(open.slice(0, 5));
                const pc = {}; d.forEach(t => { pc[t.priority] = (pc[t.priority] || 0) + 1; });
                const pC = { Critical: '#A32D2D', High: '#E24B4A', Medium: '#EF9F27', Low: '#1D9E75' };
                setTicketsByPriority(Object.entries(pc).map(([k, v]) => ({ label: k, value: v, color: pC[k] || '#888' })));
            }
            if (audit.status === 'fulfilled') setRecentActivity(audit.value || []);
        } catch { }
        setStats(s); setLoading(false);
    };

    const handleCreateUser = async (e) => {
        e.preventDefault(); setCreateError(null); setCreateSuccess(''); setSaving(true);
        try {
            await axiosClient.post('/users', { username: userForm.username, fullName: userForm.fullName, email: userForm.email, phone: userForm.phone || null, role: userForm.role, password: userForm.password });
            setCreateSuccess('User "' + userForm.username + '" created.'); setUserForm({ username: '', fullName: '', email: '', phone: '', role: 'Student', password: '' }); setShowCreateUser(false); loadAll();
        } catch (err) { setCreateError(err); } finally { setSaving(false); }
    };

    const handleChange = (e) => setUserForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    if (loading) return <Loading message="Loading your dashboard..." />;

    const STATS = [
        { label: 'Total Users', value: stats.users, icon: 'bi-people-fill', color: '#185FA5', bg: 'linear-gradient(135deg, #E6F1FB, #d4e8f8)', to: '/users' },
        { label: 'Open Tickets', value: stats.openTickets, icon: 'bi-headset', color: '#A32D2D', bg: 'linear-gradient(135deg, #FCEBEB, #f8d4d4)', to: '/tickets' },
        { label: 'Students', value: stats.students, icon: 'bi-mortarboard-fill', color: '#27500A', bg: 'linear-gradient(135deg, #EAF3DE, #d8ebc5)', to: '/students' },
        { label: 'Courses', value: stats.courses, icon: 'bi-book-fill', color: '#3C3489', bg: 'linear-gradient(135deg, #EEEDFE, #dddaf8)', to: '/courses' },
    ];

    const QA = [
        { label: 'Users', icon: 'bi-people', to: '/users', color: '#185FA5', bg: '#E6F1FB' },
        { label: 'Tickets', icon: 'bi-headset', to: '/tickets', color: '#A32D2D', bg: '#FCEBEB' },
        { label: 'Students', icon: 'bi-mortarboard', to: '/students', color: '#27500A', bg: '#EAF3DE' },
        { label: 'Courses', icon: 'bi-book', to: '/courses', color: '#3C3489', bg: '#EEEDFE' },
        { label: 'Reports', icon: 'bi-file-earmark-bar-graph', to: '/reports', color: '#854F0B', bg: '#FAEEDA' },
        { label: 'KPIs', icon: 'bi-bar-chart-line', to: '/kpis', color: '#0F6E56', bg: '#E1F5EE' },
        { label: 'Audit Log', icon: 'bi-journal-text', to: '/audit-log', color: '#993C1D', bg: '#FAECE7' },
        { label: 'Notify', icon: 'bi-bell', to: '/notifications', color: '#791F1F', bg: '#FCEBEB' },
    ];

    const sPct = stats.students ? Math.round((stats.activeStudents || 0) / stats.students * 100) : 0;
    const tPct = (stats.openTickets != null && stats.resolvedTickets != null) ? Math.round(stats.resolvedTickets / ((stats.openTickets + stats.resolvedTickets) || 1) * 100) : 0;

    return (
        <div>
            <style>{`@keyframes fsu { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>

            <div className="d-flex align-items-center justify-content-between mb-4" style={{ background: 'linear-gradient(135deg, #1a3c6e 0%, #2a5a9e 60%, #3b7dcc 100%)', borderRadius: 16, padding: '22px 28px', color: 'white', animation: 'fsu 0.5s ease both' }}>
                <div>
                    <h4 className="mb-1" style={{ fontWeight: 600, fontSize: 20 }}>{greeting}, {username} <span role="img" aria-label="wave">&#x1F44B;</span></h4>
                    <p className="mb-0" style={{ opacity: 0.8, fontSize: 13 }}>{today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}{' \u00b7 Term: 2026-Spring \u00b7 Full access'}</p>
                </div>
                <button className="btn btn-sm d-flex align-items-center gap-2" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 500, border: '1px solid rgba(255,255,255,0.25)', transition: 'background 0.2s' }} onClick={() => { setShowCreateUser(true); setCreateError(null); setCreateSuccess(''); }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
                    <i className="bi bi-person-plus"></i>Create User
                </button>
            </div>

            {createSuccess && <div className="alert alert-success d-flex align-items-center justify-content-between mb-4" style={{ borderRadius: 12, border: 'none' }}><span><i className="bi bi-check-circle me-2"></i>{createSuccess}</span><button className="btn-close" onClick={() => setCreateSuccess('')}></button></div>}

            <div className="row g-3 mb-4">
                {STATS.map((s, i) => (
                    <div key={i} className="col-md-3 col-sm-6" style={{ animation: 'fsu 0.4s ease ' + (0.1 + i * 0.08) + 's both' }}>
                        <div style={{ ...S.card, background: s.bg, cursor: 'pointer', padding: '18px 20px' }} onClick={() => navigate(s.to)} onMouseEnter={e => Object.assign(e.currentTarget.style, S.cardHover)} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <span style={{ fontSize: 12, color: s.color, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>{s.label}</span>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: s.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className={'bi ' + s.icon} style={{ fontSize: 16, color: s.color }}></i></div>
                            </div>
                            <div style={{ fontSize: 30, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{s.value != null ? s.value : '\u2014'}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="row g-3 mb-4">
                <div className="col-lg-8" style={{ animation: 'fsu 0.5s ease 0.4s both' }}>
                    <div style={S.card}>
                        <div style={S.ch}><span style={S.ht}><i className="bi bi-bar-chart-fill"></i>Users by role</span><span style={S.va} onClick={() => navigate('/users')}>View all <i className="bi bi-arrow-right"></i></span></div>
                        <div style={{ padding: '20px 16px 12px' }}>{roleCounts.length > 0 ? <BarChart data={roleCounts} /> : <p style={{ color: '#888', fontSize: 13, textAlign: 'center' }}>No data</p>}</div>
                    </div>
                </div>
                <div className="col-lg-4" style={{ animation: 'fsu 0.5s ease 0.5s both' }}>
                    <div style={S.card}>
                        <div style={S.ch}><span style={S.ht}><i className="bi bi-pie-chart-fill"></i>Tickets overview</span></div>
                        <div className="d-flex flex-column align-items-center" style={{ padding: '16px 12px' }}>
                            {ticketsByPriority.length > 0 ? (<><DonutChart data={ticketsByPriority} /><div className="d-flex flex-wrap justify-content-center gap-2 mt-2">{ticketsByPriority.map((d, i) => <span key={i} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }}></span>{d.label} ({d.value})</span>)}</div></>) : <p style={{ color: '#888', fontSize: 13 }}>No tickets</p>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-lg-5" style={{ animation: 'fsu 0.5s ease 0.55s both' }}>
                    <div style={{ ...S.card, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={S.ch}><span style={S.ht}><i className="bi bi-clock-history"></i>Recent activity</span><span style={S.va} onClick={() => navigate('/audit-log')}>View all <i className="bi bi-arrow-right"></i></span></div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {recentActivity.length === 0 ? <p style={{ color: '#888', fontSize: 13, padding: 16 }}>No recent activity.</p> : recentActivity.map((log, idx) => {
                                const ac = ACTION_COLORS[log.action] || ACTION_COLORS.default;
                                return (
                                    <div key={log.auditID || idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #f5f5f5' }}>
                                        <div style={{ width: 34, height: 34, borderRadius: 10, background: ac.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><i className={'bi ' + ac.icon} style={{ fontSize: 14, color: ac.color }}></i></div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: '#222' }}>{log.action}</div>
                                            <div style={{ fontSize: 11, color: '#999' }}>User #{log.userID} &middot; {log.resourceType}{log.detailsJSON && (() => { try { const d = JSON.parse(log.detailsJSON); return d.role ? ' \u00b7 ' + d.role : ''; } catch { return ''; } })()}</div>
                                        </div>
                                        <span style={{ fontSize: 11, color: '#aaa', flexShrink: 0 }}>{timeAgo(log.timestamp)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="col-lg-4" style={{ animation: 'fsu 0.5s ease 0.6s both' }}>
                    <div style={{ ...S.card, height: '100%' }}>
                        <div style={S.ch}><span style={S.ht}><i className="bi bi-lightning-charge-fill"></i>Quick actions</span></div>
                        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                            {QA.map((q, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 8px', borderRadius: 12, cursor: 'pointer', background: q.bg, transition: 'transform 0.15s ease, box-shadow 0.15s ease' }} onClick={() => navigate(q.to)} onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}>
                                    <i className={'bi ' + q.icon} style={{ fontSize: 22, color: q.color, marginBottom: 6 }}></i>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: q.color }}>{q.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="col-lg-3" style={{ animation: 'fsu 0.5s ease 0.65s both' }}>
                    <div style={{ ...S.card, height: '100%' }}>
                        <div style={S.ch}><span style={S.ht}><i className="bi bi-graph-up"></i>Overview</span></div>
                        <div style={{ padding: 20 }}>
                            <ProgressBar label="Active students" pct={sPct} color="#1D9E75" />
                            <ProgressBar label="Tickets resolved" pct={tPct} color="#185FA5" />
                            <ProgressBar label="MFA adoption" pct={stats.users ? Math.round(((stats.users - 3) / stats.users) * 100) : 0} color="#3C3489" />
                            <ProgressBar label="System uptime" pct={99} color="#27500A" />
                        </div>
                    </div>
                </div>
            </div>

            {openTickets.length > 0 && (
                <div style={{ ...S.card, animation: 'fsu 0.5s ease 0.7s both' }}>
                    <div style={S.ch}>
                        <span style={S.ht}><i className="bi bi-headset"></i>Open tickets <span style={{ fontSize: 11, background: '#FCEBEB', color: '#A32D2D', padding: '2px 10px', borderRadius: 8, fontWeight: 600, marginLeft: 4 }}>{openTickets.length}</span></span>
                        <span style={S.va} onClick={() => navigate('/tickets')}>View all <i className="bi bi-arrow-right"></i></span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                            <thead><tr style={{ background: 'linear-gradient(90deg, #1a3c6e, #2a5a9e)', color: 'white' }}>
                                <th style={{ padding: '10px 16px', fontWeight: 500, fontSize: 12 }}>ID</th>
                                <th style={{ padding: '10px 16px', fontWeight: 500, fontSize: 12 }}>Subject</th>
                                <th style={{ padding: '10px 16px', fontWeight: 500, fontSize: 12 }}>Created By</th>
                                <th style={{ padding: '10px 16px', fontWeight: 500, fontSize: 12 }}>Priority</th>
                                <th style={{ padding: '10px 16px', fontWeight: 500, fontSize: 12 }}>Status</th>
                            </tr></thead>
                            <tbody>{openTickets.map(t => {
                                const pC = { Critical: '#A32D2D', High: '#E24B4A', Medium: '#EF9F27', Low: '#1D9E75' }[t.priority] || '#888';
                                const pB = { Critical: '#FCEBEB', High: '#FCEBEB', Medium: '#FAEEDA', Low: '#E1F5EE' }[t.priority] || '#f0f0f0';
                                return (
                                    <tr key={t.ticketID} style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer', transition: 'background 0.15s' }} onClick={() => navigate('/tickets')} onMouseEnter={e => e.currentTarget.style.background = '#fafafa'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '10px 16px', fontVariantNumeric: 'tabular-nums', color: '#888' }}>#{t.ticketID}</td>
                                        <td style={{ padding: '10px 16px', fontWeight: 500 }}>{t.subject}</td>
                                        <td style={{ padding: '10px 16px', color: '#888' }}>{t.createdByUsername || '\u2014'}</td>
                                        <td style={{ padding: '10px 16px' }}><span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 8, background: pB, color: pC }}>{t.priority}</span></td>
                                        <td style={{ padding: '10px 16px' }}><span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: t.status === 'Open' ? '#EF9F27' : '#185FA5' }}></span>{t.status}</span></td>
                                    </tr>
                                );
                            })}</tbody>
                        </table>
                    </div>
                </div>
            )}

            {showCreateUser && createPortal(<>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, backdropFilter: 'blur(2px)', animation: 'modalFadeIn 0.25s ease both' }}></div>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ width: '100%', maxWidth: 720, borderRadius: 16, background: 'white', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', animation: 'modalSlideUp 0.3s ease both', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ background: 'linear-gradient(135deg, #1a3c6e, #2a5a9e)', color: 'white', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h5 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}><i className="bi bi-person-plus me-2"></i>Create new user</h5>
                            <button type="button" style={{ background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer', padding: 0, lineHeight: 1 }} onClick={() => setShowCreateUser(false)} disabled={saving}><i className="bi bi-x-lg"></i></button>
                        </div>
                        <form onSubmit={handleCreateUser}>
                            <div style={{ padding: 24 }}>
                                <div style={{ background: '#E6F1FB', color: '#0C447C', borderRadius: 10, fontSize: 13, padding: '10px 16px', marginBottom: 20 }}><i className="bi bi-info-circle me-2"></i>Privileged roles will be prompted for MFA on first login.</div>
                                <div className="row g-3">
                                    <div className="col-md-6"><label className="form-label" style={{ fontSize: 13, fontWeight: 500 }}>Username <span className="text-danger">*</span></label><input type="text" className="form-control" name="username" value={userForm.username} onChange={handleChange} placeholder="e.g. john.doe" maxLength={100} required style={{ borderRadius: 10 }} /></div>
                                    <div className="col-md-6"><label className="form-label" style={{ fontSize: 13, fontWeight: 500 }}>Full Name <span className="text-danger">*</span></label><input type="text" className="form-control" name="fullName" value={userForm.fullName} onChange={handleChange} placeholder="e.g. John Doe" maxLength={200} required style={{ borderRadius: 10 }} /></div>
                                    <div className="col-md-6"><label className="form-label" style={{ fontSize: 13, fontWeight: 500 }}>Email <span className="text-danger">*</span></label><input type="email" className="form-control" name="email" value={userForm.email} onChange={handleChange} placeholder="e.g. john@example.com" maxLength={255} required style={{ borderRadius: 10 }} /></div>
                                    <div className="col-md-6"><label className="form-label" style={{ fontSize: 13, fontWeight: 500 }}>Phone</label><input type="text" className="form-control" name="phone" value={userForm.phone} onChange={handleChange} placeholder="e.g. +91-9876543210" maxLength={20} style={{ borderRadius: 10 }} /></div>
                                    <div className="col-md-6"><label className="form-label" style={{ fontSize: 13, fontWeight: 500 }}>Role <span className="text-danger">*</span></label><select className="form-select" name="role" value={userForm.role} onChange={handleChange} required style={{ borderRadius: 10 }}>{ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                                    <div className="col-md-6"><label className="form-label" style={{ fontSize: 13, fontWeight: 500 }}>Password <span className="text-danger">*</span></label><input type="password" className="form-control" name="password" value={userForm.password} onChange={handleChange} placeholder="Min 8 characters" minLength={8} required style={{ borderRadius: 10 }} /></div>
                                </div>
                                <ErrorAlert error={createError} onDismiss={() => setCreateError(null)} />
                            </div>
                            <div style={{ background: '#f8f9fa', padding: '12px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                <button type="button" className="btn btn-outline-secondary" style={{ borderRadius: 10 }} onClick={() => setShowCreateUser(false)} disabled={saving}>Cancel</button>
                                <button type="submit" className="btn" style={{ background: 'linear-gradient(135deg, #1a3c6e, #2a5a9e)', color: 'white', border: 'none', borderRadius: 10 }} disabled={saving}>{saving ? (<><span className="spinner-border spinner-border-sm me-2"></span>Creating...</>) : (<><i className="bi bi-check-lg me-2"></i>Create user</>)}</button>
                            </div>
                        </form>
                    </div>
                </div>
                <style>{`@keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes modalSlideUp { from { opacity: 0; transform: translateY(30px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
            </>, document.body)}
        </div>
    );
}
