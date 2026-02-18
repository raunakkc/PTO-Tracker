'use client';

import { useState, useMemo } from 'react';
import {
    addDays,
    addWeeks,
    subWeeks,
    addMonths,
    subMonths,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    format,
    isToday,
    isWithinInterval,
    eachDayOfInterval,
} from 'date-fns';
import { TIME_OFF_REASONS, TimeOffReasonKey } from '@/lib/constants';
import { TimeOffRequestData, TeamMember } from '@/types';
import Legend from './Legend';

interface CalendarProps {
    requests: TimeOffRequestData[];
    users: TeamMember[];
    isManager: boolean;
    onRequestUpdate: () => void;
}

function getReasonClass(reason: string): string {
    switch (reason) {
        case 'WORK_REMOTE': return 'work-remote';
        case 'FIRST_HALF_WORK_REMOTE': return 'work-remote';
        case 'SECOND_HALF_WORK_REMOTE': return 'work-remote';
        case 'PTO': return 'pto';
        case 'FIRST_HALF_PTO': return 'first-half';
        case 'SECOND_HALF_PTO': return 'second-half';
        default: return '';
    }
}

function getReasonInfo(reason: string) {
    return TIME_OFF_REASONS[reason as TimeOffReasonKey] || TIME_OFF_REASONS.PTO;
}

export default function Calendar({ requests, users, isManager, onRequestUpdate }: CalendarProps) {
    const [view, setView] = useState<'week' | 'month'>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set());
    const [selectedRequest, setSelectedRequest] = useState<TimeOffRequestData | null>(null);
    const [approvalNote, setApprovalNote] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const days = useMemo(() => {
        let allDays: Date[];
        if (view === 'week') {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            const end = endOfWeek(currentDate, { weekStartsOn: 1 });
            allDays = eachDayOfInterval({ start, end });
        } else {
            const start = startOfMonth(currentDate);
            const end = endOfMonth(currentDate);
            allDays = eachDayOfInterval({ start, end });
        }
        // Filter out weekends
        return allDays.filter((d) => d.getDay() !== 0 && d.getDay() !== 6);
    }, [currentDate, view]);

    // Group users by team
    const teamGroups = useMemo(() => {
        const groups: Record<string, TeamMember[]> = {};
        const noTeam: TeamMember[] = [];

        users.forEach((user) => {
            if (user.team) {
                if (!groups[user.team]) groups[user.team] = [];
                groups[user.team].push(user);
            } else {
                noTeam.push(user);
            }
        });

        // Sort team names alphabetically
        const sorted = Object.keys(groups).sort().map((teamName) => ({
            team: teamName,
            members: groups[teamName].sort((a, b) => a.name.localeCompare(b.name)),
        }));

        // Add "Unassigned" group at the end if any
        if (noTeam.length > 0) {
            sorted.push({
                team: 'Unassigned',
                members: noTeam.sort((a, b) => a.name.localeCompare(b.name)),
            });
        }

        return sorted;
    }, [users]);

    const navigate = (direction: 'prev' | 'next') => {
        if (view === 'week') {
            setCurrentDate((d) => (direction === 'next' ? addWeeks(d, 1) : subWeeks(d, 1)));
        } else {
            setCurrentDate((d) => (direction === 'next' ? addMonths(d, 1) : subMonths(d, 1)));
        }
    };

    const goToToday = () => setCurrentDate(new Date());

    const dateRangeText =
        view === 'week'
            ? `${format(days[0], 'd MMM')} - ${format(days[days.length - 1], 'd MMM yyyy')}`
            : format(currentDate, 'MMMM yyyy');

    function getRequestsForUserOnDay(userId: string, day: Date) {
        return requests.filter((r) => {
            if (r.user.id !== userId) return false;
            if (r.status === 'REJECTED') return false;
            const start = new Date(r.startDate);
            const end = new Date(r.endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return isWithinInterval(day, { start, end });
        });
    }

    // Compute low-attendance days: count users with full PTO (not half, not WFH)
    const lowAttendanceDays = useMemo(() => {
        const totalUsers = users.length;
        if (totalUsers === 0) return new Set<string>();
        const result = new Set<string>();
        days.forEach((day) => {
            let absentCount = 0;
            users.forEach((u) => {
                const dayReqs = getRequestsForUserOnDay(u.id, day);
                const hasFullPto = dayReqs.some(
                    (r) => r.reason === 'PTO' && r.status !== 'REJECTED'
                );
                if (hasFullPto) absentCount++;
            });
            const presentPercent = ((totalUsers - absentCount) / totalUsers) * 100;
            if (presentPercent < 75) {
                result.add(day.toISOString());
            }
        });
        return result;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [days, requests, users]);

    function toggleTeam(teamName: string) {
        setCollapsedTeams((prev) => {
            const next = new Set(prev);
            if (next.has(teamName)) next.delete(teamName);
            else next.add(teamName);
            return next;
        });
    }

    async function handleAction(action: 'APPROVED' | 'REJECTED') {
        if (!selectedRequest) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/requests/${selectedRequest.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: action,
                    approvalNote: approvalNote.trim() || null,
                }),
            });
            if (res.ok) {
                setSelectedRequest(null);
                setApprovalNote('');
                onRequestUpdate();
            }
        } catch { }
        setActionLoading(false);
    }

    const gridCols = `240px repeat(${days.length}, 1fr)`;

    return (
        <div>
            <div className="calendar-controls">
                <div className="calendar-nav">
                    <button className="btn btn-secondary btn-sm" onClick={goToToday}>
                        Today
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('prev')}>
                        ◀
                    </button>
                    <span className="date-range">{dateRangeText}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('next')}>
                        ▶
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Legend />
                    <div className="calendar-view-toggle">
                        <button
                            className={view === 'week' ? 'active' : ''}
                            onClick={() => setView('week')}
                        >
                            Week
                        </button>
                        <button
                            className={view === 'month' ? 'active' : ''}
                            onClick={() => setView('month')}
                        >
                            Month
                        </button>
                    </div>
                </div>
            </div>

            <div className="calendar-grid">
                {/* Header Row */}
                <div className="calendar-header-row" style={{ gridTemplateColumns: gridCols }}>
                    <div className="calendar-header-cell name-col">Team Member</div>
                    {days.map((day) => {
                        const isLow = lowAttendanceDays.has(day.toISOString());
                        return (
                            <div
                                key={day.toISOString()}
                                className={`calendar-header-cell ${isToday(day) ? 'today' : ''} ${isLow ? 'low-attendance' : ''}`}
                            >
                                <span className="day-name">{format(day, 'EEE')}</span>
                                <span className="day-number">{format(day, 'd')}</span>
                                {isLow && <span className="attendance-warn" title="Team attendance below 75%">⚠️</span>}
                            </div>
                        );
                    })}
                </div>

                {/* Team Groups */}
                {teamGroups.map(({ team, members }) => {
                    const isCollapsed = collapsedTeams.has(team);
                    const memberCount = members.length;
                    return (
                        <div key={team}>
                            {/* Team Header */}
                            <div
                                className="team-group-header"
                                onClick={() => toggleTeam(team)}
                                style={{ gridTemplateColumns: gridCols }}
                            >
                                <div className="team-group-name">
                                    <span className={`team-chevron ${isCollapsed ? 'collapsed' : ''}`}>
                                        ▾
                                    </span>
                                    <strong>{team}</strong>
                                    <span className="team-member-count">
                                        👥 {memberCount}
                                    </span>
                                </div>
                            </div>

                            {/* Members */}
                            {!isCollapsed &&
                                members.map((user) => (
                                    <div
                                        key={user.id}
                                        className="calendar-row"
                                        style={{ gridTemplateColumns: gridCols }}
                                    >
                                        <div className="calendar-user-cell">
                                            <div
                                                className="avatar"
                                                style={{ backgroundColor: user.avatarColor }}
                                            >
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="user-name">{user.name}</span>
                                        </div>

                                        {days.map((day) => {
                                            const dayRequests = getRequestsForUserOnDay(user.id, day);
                                            return (
                                                <div
                                                    key={day.toISOString()}
                                                    className={`calendar-day-cell ${isToday(day) ? 'today' : ''} ${lowAttendanceDays.has(day.toISOString()) ? 'low-attendance' : ''}`}
                                                >
                                                    {dayRequests.map((req) => {
                                                        const info = getReasonInfo(req.reason);
                                                        const cls = getReasonClass(req.reason);
                                                        const isHalfDay = info.type === 'HALF_DAY';
                                                        const isFirstHalf = req.reason === 'FIRST_HALF_PTO';
                                                        const statusClass = req.status === 'PENDING' ? 'pending' : 'approved';
                                                        const halfClass = isHalfDay
                                                            ? isFirstHalf
                                                                ? 'half-day-top'
                                                                : 'half-day-bottom'
                                                            : 'full-day';

                                                        return (
                                                            <div
                                                                key={req.id}
                                                                className={`cal-entry ${cls} ${halfClass} ${statusClass} clickable`}
                                                                onClick={() => {
                                                                    setSelectedRequest(req);
                                                                    setApprovalNote('');
                                                                }}
                                                                title={req.notes}
                                                            >
                                                                <span className="cal-entry-label">{info.label}</span>
                                                                {req.notes && (
                                                                    <span className="cal-entry-note">{req.notes}</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                        </div>
                    );
                })}

                {users.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-icon">👥</div>
                        <h3>No team members yet</h3>
                        <p>Team members will appear here once they sign up.</p>
                    </div>
                )}
            </div>

            {/* Request Detail Modal */}
            {selectedRequest && (
                <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                                style={{
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '3px',
                                    backgroundColor: getReasonInfo(selectedRequest.reason).color,
                                    display: 'inline-block',
                                }}
                            />
                            {getReasonInfo(selectedRequest.reason).label}
                        </h2>

                        <div className="request-details" style={{ marginTop: '16px' }}>
                            <div className="detail-item">
                                <div className="detail-label">Employee</div>
                                <div className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div
                                        className="avatar"
                                        style={{
                                            backgroundColor: selectedRequest.user.avatarColor,
                                            width: '24px',
                                            height: '24px',
                                            fontSize: '11px',
                                        }}
                                    >
                                        {selectedRequest.user.name.charAt(0).toUpperCase()}
                                    </div>
                                    {selectedRequest.user.name}
                                </div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">Status</div>
                                <div className="detail-value">
                                    <span className={`badge badge-${selectedRequest.status.toLowerCase()}`}>
                                        {selectedRequest.status}
                                    </span>
                                </div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">Start Date</div>
                                <div className="detail-value">
                                    {format(new Date(selectedRequest.startDate), 'dd MMM yyyy')}
                                </div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">End Date</div>
                                <div className="detail-value">
                                    {format(new Date(selectedRequest.endDate), 'dd MMM yyyy')}
                                </div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">Type</div>
                                <div className="detail-value">
                                    {getReasonInfo(selectedRequest.reason).type === 'HALF_DAY' ? 'Half Day' : 'Full Day'}
                                </div>
                            </div>
                        </div>

                        <div className="request-notes" style={{ marginTop: '12px' }}>
                            <strong>Notes:</strong> {selectedRequest.notes}
                        </div>

                        {selectedRequest.approvalNote && (
                            <div
                                className="request-notes"
                                style={{ borderLeft: '3px solid var(--accent)', marginTop: '8px' }}
                            >
                                <strong>Approval note:</strong> {selectedRequest.approvalNote}
                                {selectedRequest.approver && (
                                    <span style={{ color: 'var(--text-muted)' }}>
                                        {' '}— {selectedRequest.approver.name}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Approve/Reject actions for managers on pending requests */}
                        {isManager && selectedRequest.status === 'PENDING' && (
                            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Manager Note (optional)</label>
                                    <textarea
                                        className="form-textarea"
                                        value={approvalNote}
                                        onChange={(e) => setApprovalNote(e.target.value)}
                                        placeholder="Add a note..."
                                        style={{ minHeight: '60px' }}
                                    />
                                </div>
                                <div className="modal-actions">
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => handleAction('REJECTED')}
                                        disabled={actionLoading}
                                    >
                                        {actionLoading ? '...' : '❌ Reject'}
                                    </button>
                                    <button
                                        className="btn btn-success"
                                        onClick={() => handleAction('APPROVED')}
                                        disabled={actionLoading}
                                    >
                                        {actionLoading ? '...' : '✅ Approve'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Close button for non-pending or non-managers */}
                        {(!isManager || selectedRequest.status !== 'PENDING') && (
                            <div className="modal-actions" style={{ marginTop: '16px' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setSelectedRequest(null)}
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
