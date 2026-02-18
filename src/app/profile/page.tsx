'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { TEAMS } from '@/lib/constants';

interface ProfileData {
    id: string;
    name: string;
    email: string;
    role: string;
    team: string | null;
    avatarColor: string;
    createdAt: string;
}

export default function ProfilePage() {
    const { data: session, status, update: updateSession } = useSession();
    const router = useRouter();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState('');
    const [team, setTeam] = useState<string>('');
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    useEffect(() => {
        if (status === 'authenticated') fetchProfile();
    }, [status]);

    async function fetchProfile() {
        try {
            const res = await fetch('/api/profile');
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
                setName(data.name);
                setTeam(data.team || '');
            }
        } catch { }
        setLoading(false);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (name.trim().length < 2) {
            setError('Name must be at least 2 characters.');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    team: team || null,
                }),
            });

            if (res.ok) {
                const updated = await res.json();
                setProfile(updated);
                setSuccess('Profile updated successfully!');
                // Update the session so sidebar reflects new name/team
                await updateSession({ name: updated.name, team: updated.team });
                setTimeout(() => setSuccess(''), 3000);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to update profile.');
            }
        } catch {
            setError('Something went wrong.');
        }
        setSaving(false);
    }

    if (status === 'loading' || loading) {
        return (
            <div className="loading-spinner" style={{ minHeight: '100vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!session || !profile) return null;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <Header title="My Profile" />
                <div className="page-content">
                    <div className="page-title">
                        <h2>Edit Profile</h2>
                    </div>

                    {/* Profile Card */}
                    <div className="card" style={{ maxWidth: '600px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
                            <div
                                className="avatar"
                                style={{
                                    backgroundColor: profile.avatarColor,
                                    width: '56px',
                                    height: '56px',
                                    fontSize: '22px',
                                }}
                            >
                                {profile.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px' }}>{profile.name}</h3>
                                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{profile.email}</div>
                                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                    <span className={`badge badge-${profile.role.toLowerCase()}`}>{profile.role}</span>
                                    {profile.team && (
                                        <span className="badge" style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
                                            {profile.team}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your name"
                                    minLength={2}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Team</label>
                                <select
                                    className="form-select"
                                    value={team}
                                    onChange={(e) => setTeam(e.target.value)}
                                >
                                    <option value="">— Select your team —</option>
                                    {TEAMS.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group" style={{ opacity: 0.6 }}>
                                <label className="form-label">Email (cannot be changed)</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={profile.email}
                                    disabled
                                    style={{ cursor: 'not-allowed' }}
                                />
                            </div>

                            {error && (
                                <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="alert alert-success" style={{ marginBottom: '16px' }}>
                                    {success}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving}
                                style={{ width: '100%' }}
                            >
                                {saving ? 'Saving...' : '💾 Save Changes'}
                            </button>
                        </form>
                    </div>

                    {/* Account Info */}
                    <div className="card" style={{ maxWidth: '600px', marginTop: '16px' }}>
                        <h3 style={{ marginBottom: '12px', fontSize: '15px', color: 'var(--text-secondary)' }}>
                            Account Information
                        </h3>
                        <div className="request-details">
                            <div className="detail-item">
                                <div className="detail-label">Role</div>
                                <div className="detail-value">{profile.role}</div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">Member Since</div>
                                <div className="detail-value">
                                    {new Date(profile.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
