'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { TIME_OFF_REASONS, TimeOffReasonKey } from '@/lib/constants';
import { TimeOffRequestData } from '@/types';

export default function ApprovalsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const highlightId = searchParams.get('highlight');

    const [requests, setRequests] = useState<TimeOffRequestData[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('PENDING');
    const [actionModal, setActionModal] = useState<{
        request: TimeOffRequestData;
        action: 'APPROVED' | 'REJECTED';
    } | null>(null);
    const [approvalNote, setApprovalNote] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const user = session?.user as any;

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
        if (status === 'authenticated' && user?.role !== 'MANAGER') router.push('/calendar');
    }, [status, router, user]);

    useEffect(() => {
        if (status === 'authenticated') fetchRequests();
    }, [status]);

    // Handle highlighting after requests are loaded
    useEffect(() => {
        if (!loading && highlightId && requests.length > 0) {
            const el = document.getElementById(`req-${highlightId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('highlight-flash');
            }
        }
    }, [loading, highlightId, requests]);

    async function fetchRequests() {
        try {
            const res = await fetch('/api/requests');
            if (res.ok) setRequests(await res.json());
        } catch { }
        setLoading(false);
    }

    // ... handleAction ...

    // ... filtering ...

    // ... rendering ...

    // In the mapping loop:
    // return (
    //     <div key={req.id} id={`req-${req.id}`} className="request-card">
    // ...


    async function handleAction() {
        if (!actionModal) return;
        setActionLoading(true);

        try {
            const res = await fetch(`/api/requests/${actionModal.request.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: actionModal.action,
                    approvalNote: approvalNote.trim() || null,
                }),
            });

            if (res.ok) {
                const updated = await res.json();
                setRequests((prev) =>
                    prev.map((r) => (r.id === updated.id ? updated : r))
                );
                setActionModal(null);
                setApprovalNote('');
            }
        } catch { }
        setActionLoading(false);
    }

    const filtered =
        filter === 'ALL' ? requests : requests.filter((r) => r.status === filter);

    const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

    if (status === 'loading' || loading) {
        return (
            <div className="loading-spinner" style={{ minHeight: '100vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!session || user?.role !== 'MANAGER') return null;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <Header title="Approvals" />
                <div className="page-content">
                    <div className="page-title">
                        <h2>
                            Pending Approvals{' '}
                            {pendingCount > 0 && (
                                <span className="badge badge-pending" style={{ marginLeft: '8px', fontSize: '13px' }}>
                                    {pendingCount}
                                </span>
                            )}
                        </h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                        {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((s) => (
                            <button
                                key={s}
                                className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setFilter(s)}
                            >
                                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>

                    {filtered.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">✅</div>
                            <h3>No requests to review</h3>
                            <p>All caught up! No pending requests at the moment.</p>
                        </div>
                    ) : (
                        filtered.map((req) => {
                            const reason = TIME_OFF_REASONS[req.reason as TimeOffReasonKey];
                            return (
                                <div key={req.id} id={`req-${req.id}`} className="request-card">
                                    <div className="request-header">
                                        <div className="request-user">
                                            <div
                                                className="avatar"
                                                style={{ backgroundColor: req.user.avatarColor }}
                                            >
                                                {req.user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <strong style={{ fontSize: '14px' }}>{req.user.name}</strong>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                    {req.user.email}
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`badge badge-${req.status.toLowerCase()}`}>
                                            {req.status}
                                        </span>
                                    </div>

                                    <div className="request-details">
                                        <div className="detail-item">
                                            <div className="detail-label">Reason</div>
                                            <div className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div
                                                    style={{
                                                        width: '10px',
                                                        height: '10px',
                                                        borderRadius: '2px',
                                                        backgroundColor: reason?.color,
                                                    }}
                                                />
                                                {reason?.label || req.reason}
                                            </div>
                                        </div>
                                        <div className="detail-item">
                                            <div className="detail-label">Start</div>
                                            <div className="detail-value">
                                                {format(new Date(req.startDate), 'dd MMM yyyy')}
                                            </div>
                                        </div>
                                        <div className="detail-item">
                                            <div className="detail-label">End</div>
                                            <div className="detail-value">
                                                {format(new Date(req.endDate), 'dd MMM yyyy')}
                                            </div>
                                        </div>
                                        <div className="detail-item">
                                            <div className="detail-label">Type</div>
                                            <div className="detail-value">
                                                {reason?.type === 'HALF_DAY' ? 'Half Day' : 'Full Day'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="request-notes">
                                        <strong>Notes:</strong> {req.notes}
                                    </div>

                                    {req.approvalNote && (
                                        <div
                                            className="request-notes"
                                            style={{ borderLeft: '3px solid var(--accent)', marginTop: '8px' }}
                                        >
                                            <strong>Approval note:</strong> {req.approvalNote}
                                            {req.approver && (
                                                <span style={{ color: 'var(--text-muted)' }}> — {req.approver.name}</span>
                                            )}
                                        </div>
                                    )}

                                    {req.status === 'PENDING' && (
                                        <div className="request-actions">
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() =>
                                                    setActionModal({ request: req, action: 'REJECTED' })
                                                }
                                            >
                                                ❌ Reject
                                            </button>
                                            <button
                                                className="btn btn-success btn-sm"
                                                onClick={() =>
                                                    setActionModal({ request: req, action: 'APPROVED' })
                                                }
                                            >
                                                ✅ Approve
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}

                    {/* Approval/Reject Modal */}
                    {actionModal && (
                        <div className="modal-overlay" onClick={() => setActionModal(null)}>
                            <div className="modal" onClick={(e) => e.stopPropagation()}>
                                <h2>
                                    {actionModal.action === 'APPROVED' ? '✅ Approve' : '❌ Reject'} Request
                                </h2>
                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                    {actionModal.action === 'APPROVED'
                                        ? `Approve ${actionModal.request.user.name}'s time-off request?`
                                        : `Reject ${actionModal.request.user.name}'s time-off request?`}
                                </p>

                                <div className="form-group">
                                    <label className="form-label">
                                        Note (optional)
                                    </label>
                                    <textarea
                                        className="form-textarea"
                                        value={approvalNote}
                                        onChange={(e) => setApprovalNote(e.target.value)}
                                        placeholder="Add a note for the employee..."
                                        style={{ minHeight: '80px' }}
                                    />
                                </div>

                                <div className="modal-actions">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setActionModal(null);
                                            setApprovalNote('');
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className={`btn ${actionModal.action === 'APPROVED' ? 'btn-success' : 'btn-danger'}`}
                                        onClick={handleAction}
                                        disabled={actionLoading}
                                    >
                                        {actionLoading
                                            ? 'Processing...'
                                            : actionModal.action === 'APPROVED'
                                                ? 'Approve'
                                                : 'Reject'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
