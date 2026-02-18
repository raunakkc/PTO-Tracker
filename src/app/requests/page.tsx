'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { TIME_OFF_REASONS, TimeOffReasonKey } from '@/lib/constants';
import { TimeOffRequestData } from '@/types';

export default function MyRequestsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [requests, setRequests] = useState<TimeOffRequestData[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [ownerFilter, setOwnerFilter] = useState<'mine' | 'all'>('mine');

    // Edit modal state
    const [editingRequest, setEditingRequest] = useState<TimeOffRequestData | null>(null);
    const [editReason, setEditReason] = useState('');
    const [editStartDate, setEditStartDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [editError, setEditError] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    const user = session?.user as any;
    const isManager = user?.role === 'MANAGER';

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    useEffect(() => {
        if (status === 'authenticated') fetchRequests();
    }, [status]);

    async function fetchRequests() {
        try {
            const res = await fetch('/api/requests');
            if (res.ok) {
                const data = await res.json();
                setRequests(data);
            }
        } catch { }
        setLoading(false);
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this request? Managers will be notified.')) return;
        try {
            const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setRequests((prev) => prev.filter((r) => r.id !== id));
            }
        } catch { }
    }

    function openEditModal(req: TimeOffRequestData) {
        setEditingRequest(req);
        setEditReason(req.reason);
        setEditStartDate(format(new Date(req.startDate), 'yyyy-MM-dd'));
        setEditEndDate(format(new Date(req.endDate), 'yyyy-MM-dd'));
        setEditNotes(req.notes);
        setEditError('');
    }

    async function handleEditSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!editingRequest) return;
        setEditError('');

        if (!editReason || !editStartDate || !editEndDate || !editNotes.trim()) {
            setEditError('All fields are required');
            return;
        }

        const start = new Date(editStartDate);
        const end = new Date(editEndDate);
        if (start.getDay() === 0 || start.getDay() === 6) {
            setEditError('Start date falls on a weekend.');
            return;
        }
        if (end.getDay() === 0 || end.getDay() === 6) {
            setEditError('End date falls on a weekend.');
            return;
        }
        if (end < start) {
            setEditError('End date must be after start date.');
            return;
        }

        setEditLoading(true);
        try {
            const res = await fetch(`/api/requests/${editingRequest.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reason: editReason,
                    startDate: editStartDate,
                    endDate: editEndDate,
                    notes: editNotes.trim(),
                }),
            });

            if (res.ok) {
                setEditingRequest(null);
                fetchRequests();
            } else {
                const data = await res.json();
                setEditError(data.error || 'Failed to update request');
            }
        } catch {
            setEditError('Something went wrong');
        }
        setEditLoading(false);
    }

    const editIsHalfDay = editReason === 'FIRST_HALF_PTO' || editReason === 'SECOND_HALF_PTO';

    useEffect(() => {
        if (editIsHalfDay && editStartDate) {
            setEditEndDate(editStartDate);
        }
    }, [editIsHalfDay, editStartDate]);

    // Filter logic: non-managers always see only their own
    let displayRequests = requests;
    if (!isManager || ownerFilter === 'mine') {
        displayRequests = requests.filter((r) => r.user.id === user?.id);
    }
    if (statusFilter !== 'ALL') {
        displayRequests = displayRequests.filter((r) => r.status === statusFilter);
    }

    if (status === 'loading' || loading) {
        return (
            <div className="loading-spinner" style={{ minHeight: '100vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!session) return null;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <Header title="My Requests" />
                <div className="page-content">
                    <div className="page-title">
                        <h2>{isManager && ownerFilter === 'all' ? 'All Requests' : 'My Time-Off Requests'}</h2>
                        <Link href="/requests/new" className="btn btn-primary">
                            ➕ Apply for Leave
                        </Link>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Status filter */}
                        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((s) => (
                            <button
                                key={s}
                                className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setStatusFilter(s)}
                            >
                                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                            </button>
                        ))}

                        {/* Owner filter — managers only */}
                        {isManager && (
                            <>
                                <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>|</span>
                                <button
                                    className={`btn btn-sm ${ownerFilter === 'mine' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setOwnerFilter('mine')}
                                >
                                    👤 My Requests
                                </button>
                                <button
                                    className={`btn btn-sm ${ownerFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setOwnerFilter('all')}
                                >
                                    👥 All Requests
                                </button>
                            </>
                        )}
                    </div>

                    {displayRequests.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📋</div>
                            <h3>No requests found</h3>
                            <p>
                                {isManager && ownerFilter === 'all'
                                    ? 'No matching requests from any team member.'
                                    : "You haven\u0027t made any time-off requests yet."}
                            </p>
                        </div>
                    ) : (
                        displayRequests.map((req) => {
                            const reason = TIME_OFF_REASONS[req.reason as TimeOffReasonKey];
                            const isOwn = req.user.id === user?.id;
                            return (
                                <div key={req.id} className="request-card">
                                    <div className="request-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div
                                                style={{
                                                    width: '12px',
                                                    height: '12px',
                                                    borderRadius: '3px',
                                                    backgroundColor: reason?.color || '#6366f1',
                                                }}
                                            />
                                            <strong style={{ fontSize: '15px' }}>
                                                {reason?.label || req.reason}
                                            </strong>
                                            {/* Show requester name when viewing all */}
                                            {isManager && ownerFilter === 'all' && (
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                                                    — {req.user.name}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`badge badge-${req.status.toLowerCase()}`}>
                                            {req.status}
                                        </span>
                                    </div>

                                    <div className="request-details">
                                        <div className="detail-item">
                                            <div className="detail-label">Start Date</div>
                                            <div className="detail-value">
                                                {format(new Date(req.startDate), 'dd MMM yyyy')}
                                            </div>
                                        </div>
                                        <div className="detail-item">
                                            <div className="detail-label">End Date</div>
                                            <div className="detail-value">
                                                {format(new Date(req.endDate), 'dd MMM yyyy')}
                                            </div>
                                        </div>
                                        <div className="detail-item">
                                            <div className="detail-label">Type</div>
                                            <div className="detail-value">{reason?.type === 'HALF_DAY' ? 'Half Day' : 'Full Day'}</div>
                                        </div>
                                        {req.approver && (
                                            <div className="detail-item">
                                                <div className="detail-label">Reviewed By</div>
                                                <div className="detail-value">{req.approver.name}</div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="request-notes">{req.notes}</div>

                                    {req.approvalNote && (
                                        <div
                                            className="request-notes"
                                            style={{ borderLeft: '3px solid var(--accent)', marginTop: '8px' }}
                                        >
                                            <strong>Manager note:</strong> {req.approvalNote}
                                        </div>
                                    )}

                                    {/* Only show edit/delete for own requests */}
                                    {isOwn && (
                                        <div className="request-actions">
                                            {(req.status === 'PENDING' || req.status === 'APPROVED') && (
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => openEditModal(req)}
                                                >
                                                    ✏️ Edit
                                                </button>
                                            )}
                                            {req.status === 'PENDING' && (
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => handleDelete(req.id)}
                                                >
                                                    🗑️ Delete
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Managers can review pending requests from others */}
                                    {isManager && !isOwn && req.status === 'PENDING' && (
                                        <div className="request-actions">
                                            <Link
                                                href={`/approvals?highlight=${req.id}`}
                                                className="btn btn-primary btn-sm"
                                            >
                                                👀 Review
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </main>

            {/* Edit Modal */}
            {editingRequest && (
                <div className="modal-overlay" onClick={() => setEditingRequest(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                        <h2>✏️ Edit Request</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                            Editing this request will reset it to <strong>Pending</strong> for re-approval.
                        </p>

                        {editError && (
                            <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                                {editError}
                            </div>
                        )}

                        <form onSubmit={handleEditSubmit}>
                            <div className="form-group">
                                <label className="form-label">Time-Off Reason</label>
                                <select
                                    className="form-select"
                                    value={editReason}
                                    onChange={(e) => setEditReason(e.target.value)}
                                    required
                                >
                                    {Object.entries(TIME_OFF_REASONS).map(([key, val]) => (
                                        <option key={key} value={key}>
                                            {val.label} ({val.type === 'HALF_DAY' ? 'Half Day' : 'Full Day'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Start Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={editStartDate}
                                        onChange={(e) => setEditStartDate(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        End Date{editIsHalfDay ? ' (same as start)' : ''}
                                    </label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={editEndDate}
                                        onChange={(e) => setEditEndDate(e.target.value)}
                                        min={editStartDate}
                                        disabled={editIsHalfDay}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea
                                    className="form-textarea"
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    required
                                    style={{ minHeight: '80px' }}
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setEditingRequest(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={editLoading}
                                >
                                    {editLoading ? 'Saving...' : '💾 Save & Resubmit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
