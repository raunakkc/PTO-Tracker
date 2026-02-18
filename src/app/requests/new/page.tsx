'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { TIME_OFF_REASONS, TimeOffReasonKey } from '@/lib/constants';

export default function ApplyLeavePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [reason, setReason] = useState<string>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    const selectedReason = reason ? TIME_OFF_REASONS[reason as TimeOffReasonKey] : null;
    const isHalfDay = selectedReason?.type === 'HALF_DAY';

    // Auto-set end date = start date for half-day requests
    useEffect(() => {
        if (isHalfDay && startDate) {
            setEndDate(startDate);
        }
    }, [isHalfDay, startDate]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        if (!reason || !startDate || !endDate || !notes.trim()) {
            setError('All fields are required');
            return;
        }

        if (new Date(endDate) < new Date(startDate)) {
            setError('End date must be after start date');
            return;
        }

        // Weekend validation
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start.getDay() === 0 || start.getDay() === 6) {
            setError('Start date falls on a weekend. Please select a weekday.');
            return;
        }
        if (end.getDay() === 0 || end.getDay() === 6) {
            setError('End date falls on a weekend. Please select a weekday.');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason, startDate, endDate, notes: notes.trim() }),
            });

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => router.push('/requests'), 1500);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to submit request');
            }
        } catch {
            setError('Something went wrong');
        }
        setLoading(false);
    }

    if (status === 'loading') {
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
                <Header title="Apply for Leave" />
                <div className="page-content">
                    <div style={{ maxWidth: '600px' }}>
                        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>
                            New Time-Off Request
                        </h2>

                        {success ? (
                            <div
                                className="card"
                                style={{ textAlign: 'center', padding: '40px' }}
                            >
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                                <h3 style={{ marginBottom: '8px' }}>Request Submitted!</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                    Your request has been sent to all managers for approval.
                                </p>
                            </div>
                        ) : (
                            <div className="card">
                                {error && <div className="auth-error">{error}</div>}

                                <form onSubmit={handleSubmit}>
                                    <div className="form-group">
                                        <label className="form-label">Time-Off Reason *</label>
                                        <select
                                            className="form-select"
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            required
                                        >
                                            <option value="">Select a reason...</option>
                                            {Object.entries(TIME_OFF_REASONS).map(([key, val]) => (
                                                <option key={key} value={key}>
                                                    {val.label} ({val.type === 'HALF_DAY' ? 'Half Day' : 'Full Day'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedReason && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '10px 14px',
                                                background: `${selectedReason.color}15`,
                                                border: `1px solid ${selectedReason.color}30`,
                                                borderRadius: 'var(--radius-md)',
                                                marginBottom: '20px',
                                                fontSize: '13px',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: '12px',
                                                    height: '12px',
                                                    borderRadius: '3px',
                                                    backgroundColor: selectedReason.color,
                                                }}
                                            />
                                            <span style={{ color: selectedReason.color }}>
                                                {selectedReason.label} — {selectedReason.type === 'HALF_DAY' ? 'Half Day' : 'Full Day'}
                                            </span>
                                        </div>
                                    )}

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Start Date *</label>
                                            <input
                                                type="date"
                                                className="form-input"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">
                                                End Date *{isHalfDay ? ' (same as start for half-day)' : ''}
                                            </label>
                                            <input
                                                type="date"
                                                className="form-input"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                min={startDate}
                                                disabled={isHalfDay}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Notes * (reason for leave)</label>
                                        <textarea
                                            className="form-textarea"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Please provide details about your time off..."
                                            required
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => router.back()}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={loading}
                                        >
                                            {loading ? 'Submitting...' : 'Submit Request'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
