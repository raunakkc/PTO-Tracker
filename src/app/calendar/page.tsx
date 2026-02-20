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

    async function handleDownloadPDF() {
        const calendarElement = document.getElementById('calendar-container');
        if (!calendarElement) return;

        try {
            // Dynamically import libraries to avoid SSR issues
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;

            const canvas = await html2canvas(calendarElement, {
                scale: 2, // Higher scale for better quality
                useCORS: true,
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = 10;

            pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
            pdf.save('PTO-Calendar.pdf');
        } catch (err) {
            console.error('PDF Generation failed', err);
            alert('Failed to generate PDF');
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!session) return null;

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Header title="Team Calendar" />
                <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={handleDownloadPDF}
                            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
                        >
                            <span>Download PDF</span>
                        </button>
                    </div>
                    <div id="calendar-container" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
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
                </div>
            </main>
        </div>
    );
}
