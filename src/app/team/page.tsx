'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { TeamMember } from '@/types';

interface BalanceUser {
    id: string;
    name: string;
    email: string;
    team: string | null;
    avatarColor: string;
    workRemoteBalance: number;
    usedDays: number;
    remaining: number;
}

export default function TeamPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [resetModal, setResetModal] = useState<TeamMember | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Tab state
    const [activeTab, setActiveTab] = useState<'members' | 'balance'>('members');

    // Balance state
    const [balanceUsers, setBalanceUsers] = useState<BalanceUser[]>([]);
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [bulkBalance, setBulkBalance] = useState('');

    const user = session?.user as any;

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
        if (status === 'authenticated' && user?.role !== 'MANAGER') router.push('/calendar');
    }, [status, router, user]);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchMembers();
            fetchBalances();
        }
    }, [status]);

    async function fetchMembers() {
        try {
            const res = await fetch('/api/team');
            if (res.ok) setMembers(await res.json());
        } catch { }
        setLoading(false);
    }

    async function fetchBalances() {
        setBalanceLoading(true);
        try {
            const res = await fetch('/api/team/balance');
            if (res.ok) setBalanceUsers(await res.json());
        } catch { }
        setBalanceLoading(false);
    }

    async function handleRoleChange(id: string, newRole: string) {
        try {
            const res = await fetch(`/api/team/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            });
            if (res.ok) {
                const updated = await res.json();
                setMembers((prev) =>
                    prev.map((m) => (m.id === updated.id ? { ...m, role: updated.role } : m))
                );
            }
        } catch { }
    }

    async function handleRemove(id: string, name: string) {
        if (!confirm(`Remove ${name} from the team? This will delete all their data.`)) return;
        try {
            const res = await fetch(`/api/team/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setMembers((prev) => prev.filter((m) => m.id !== id));
            }
        } catch { }
    }

    async function handleResetPassword() {
        if (!resetModal || !newPassword || newPassword.length < 6) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/team/${resetModal.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword }),
            });
            if (res.ok) {
                setResetModal(null);
                setNewPassword('');
                alert('Password has been reset successfully.');
            }
        } catch { }
        setActionLoading(false);
    }

    async function handleBalanceUpdate(userId: string, balance: number) {
        try {
            const res = await fetch('/api/team/balance', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, balance }),
            });
            if (res.ok) {
                setBalanceUsers((prev) =>
                    prev.map((u) =>
                        u.id === userId
                            ? { ...u, workRemoteBalance: balance, remaining: balance - u.usedDays }
                            : u
                    )
                );
            }
        } catch { }
    }

    async function handleBulkBalance() {
        const val = parseInt(bulkBalance);
        if (isNaN(val) || val < 0) return;
        if (!confirm(`Set Work Remote balance to ${val} for ALL users?`)) return;
        try {
            const res = await fetch('/api/team/balance', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ setAll: true, balance: val }),
            });
            if (res.ok) {
                setBulkBalance('');
                fetchBalances();
            }
        } catch { }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="loading-spinner" style={{ minHeight: '100vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!session || user?.role !== 'MANAGER') return null;

    const managerCount = members.filter((m) => m.role === 'MANAGER').length;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <Header title="Team Management" />
                <div className="page-content">
                    <div className="page-title">
                        <h2>Team Management</h2>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                        <button
                            className={`btn btn-sm ${activeTab === 'members' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('members')}
                        >
                            👥 Members
                        </button>
                        <button
                            className={`btn btn-sm ${activeTab === 'balance' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('balance')}
                        >
                            🏠 WFH Balance
                        </button>
                    </div>

                    {/* ===== Members Tab ===== */}
                    {activeTab === 'members' && (
                        <>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-label">Total Members</div>
                                    <div className="stat-value">{members.length}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Managers</div>
                                    <div className="stat-value">{managerCount}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Users</div>
                                    <div className="stat-value">{members.length - managerCount}</div>
                                </div>
                            </div>

                            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                                <table className="team-table">
                                    <thead>
                                        <tr>
                                            <th>Member</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {members.map((member) => {
                                            const isSelf = member.id === user.id;
                                            return (
                                                <tr key={member.id}>
                                                    <td>
                                                        <div className="user-cell">
                                                            <div
                                                                className="avatar"
                                                                style={{ backgroundColor: member.avatarColor }}
                                                            >
                                                                {member.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 500 }}>
                                                                    {member.name}
                                                                    {isSelf && (
                                                                        <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: '6px' }}>
                                                                            (You)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ color: 'var(--text-secondary)' }}>{member.email}</td>
                                                    <td>
                                                        <span className={`badge badge-${member.role.toLowerCase()}`}>
                                                            {member.role}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            {!isSelf && (
                                                                <>
                                                                    <button
                                                                        className="btn btn-secondary btn-sm"
                                                                        onClick={() =>
                                                                            handleRoleChange(
                                                                                member.id,
                                                                                member.role === 'MANAGER' ? 'USER' : 'MANAGER'
                                                                            )
                                                                        }
                                                                    >
                                                                        {member.role === 'MANAGER' ? '⬇ Demote' : '⬆ Promote'}
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-ghost btn-sm"
                                                                        onClick={() => setResetModal(member)}
                                                                    >
                                                                        🔑 Reset PW
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-danger btn-sm"
                                                                        onClick={() => handleRemove(member.id, member.name)}
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* ===== WFH Balance Tab ===== */}
                    {activeTab === 'balance' && (
                        <>
                            <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    <strong style={{ fontSize: '14px' }}>Set for all users:</strong>
                                    <input
                                        type="number"
                                        className="balance-input"
                                        value={bulkBalance}
                                        onChange={(e) => setBulkBalance(e.target.value)}
                                        placeholder="12"
                                        min={0}
                                    />
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={handleBulkBalance}
                                        disabled={!bulkBalance || isNaN(parseInt(bulkBalance))}
                                    >
                                        Apply to All
                                    </button>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                        Sets the total Work Remote day allowance for every user
                                    </span>
                                </div>
                            </div>

                            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                                {balanceLoading ? (
                                    <div className="loading-spinner" style={{ padding: '40px' }}>
                                        <div className="spinner"></div>
                                    </div>
                                ) : (
                                    <table className="balance-table">
                                        <thead>
                                            <tr>
                                                <th>Member</th>
                                                <th>Team</th>
                                                <th>Balance</th>
                                                <th>Used</th>
                                                <th>Remaining</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {balanceUsers.map((bu) => (
                                                <tr key={bu.id}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div
                                                                className="avatar"
                                                                style={{ backgroundColor: bu.avatarColor, width: '28px', height: '28px', fontSize: '12px' }}
                                                            >
                                                                {bu.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span style={{ fontWeight: 500 }}>{bu.name}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ color: 'var(--text-secondary)' }}>
                                                        {bu.team || '—'}
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="balance-input"
                                                            value={bu.workRemoteBalance}
                                                            onChange={(e) => {
                                                                const v = parseInt(e.target.value);
                                                                if (!isNaN(v) && v >= 0) {
                                                                    handleBalanceUpdate(bu.id, v);
                                                                }
                                                            }}
                                                            min={0}
                                                        />
                                                    </td>
                                                    <td>
                                                        <span style={{ color: 'var(--color-work-remote-text)', fontWeight: 600 }}>
                                                            {bu.usedDays}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span
                                                            style={{
                                                                fontWeight: 600,
                                                                color: bu.remaining <= 0
                                                                    ? 'var(--danger)'
                                                                    : bu.remaining <= 3
                                                                        ? 'var(--warning)'
                                                                        : 'var(--success)',
                                                            }}
                                                        >
                                                            {bu.remaining}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </>
                    )}

                    {/* Reset Password Modal */}
                    {resetModal && (
                        <div className="modal-overlay" onClick={() => setResetModal(null)}>
                            <div className="modal" onClick={(e) => e.stopPropagation()}>
                                <h2>🔑 Reset Password</h2>
                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                    Reset password for <strong>{resetModal.name}</strong>
                                </p>

                                <div className="form-group">
                                    <label className="form-label">New Password (min. 6 characters)</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        minLength={6}
                                    />
                                </div>

                                <div className="modal-actions">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setResetModal(null);
                                            setNewPassword('');
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleResetPassword}
                                        disabled={actionLoading || newPassword.length < 6}
                                    >
                                        {actionLoading ? 'Resetting...' : 'Reset Password'}
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
