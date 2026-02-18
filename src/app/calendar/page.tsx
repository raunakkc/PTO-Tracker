'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Calendar from '@/components/Calendar';
import { TimeOffRequestData, TeamMember } from '@/types';

export default function CalendarPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [requests, setRequests] = useState<TimeOffRequestData[]>([]);
    const [users, setUsers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        if (status === 'authenticated') {
            Promise.all([fetchRequests(), fetchUsers()]).then(() => setLoading(false));
        }
    }, [status]);

    async function fetchRequests() {
        try {
            const res = await fetch('/api/requests?view=calendar');
            if (res.ok) {
                const data = await res.json();
                setRequests(data);
            }
        } catch { }
    }

    async function fetchUsers() {
        try {
            const res = await fetch('/api/team');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
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

    if (!session) return null;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <Header title="Team Calendar" />
                <div className="page-content">
                    <Calendar
                        requests={requests}
                        users={users}
                        isManager={(session.user as any).role === 'MANAGER'}
                        onRequestUpdate={async () => {
                            const res = await fetch('/api/requests?view=calendar');
                            if (res.ok) setRequests(await res.json());
                        }}
                    />
                </div>
            </main>
        </div>
    );
}
