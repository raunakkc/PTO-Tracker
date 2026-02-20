'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import NotificationBell from './NotificationBell';
import { useTheme } from './ThemeProvider';
import { ArrowDownTrayIcon, XMarkIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
    title: string;
    handleDownloadPDF?: () => Promise<void>;
}

export default function Header({ title, handleDownloadPDF }: HeaderProps) {
    const { theme, toggleTheme } = useTheme();
    const { data: session } = useSession();

    // Export Modal State
    const [showExportModal, setShowExportModal] = useState(false);
    const [showExcelModal, setShowExcelModal] = useState(false);
    const [exportStart, setExportStart] = useState('');
    const [exportEnd, setExportEnd] = useState('');

    const handleExport = () => {
        if (!exportStart || !exportEnd) return;
        window.location.href = `/api/export/excel?startDate=${exportStart}&endDate=${exportEnd}`;
        setShowExcelModal(false);
    };

    const isManager = (session?.user as any)?.role === 'MANAGER';

    return (
        <>
            <header className="header">
                {/* Left: Title */}
                <div className="header-title">
                    {title}
                </div>

                {/* Right: Actions */}
                <div className="header-actions">

                    {/* Export Dropdown */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowExportModal(!showExportModal)}
                            className="notification-btn"
                            title="Export Data"
                        >
                            <ArrowDownTrayIcon className="w-5 h-5" />
                        </button>

                        {/* Export Menu */}
                        {showExportModal && (
                            <div className="notification-dropdown" style={{ width: '160px', right: 0, left: 'auto' }}>
                                <div className="notification-list">
                                    <div
                                        onClick={async () => {
                                            setShowExportModal(false);
                                            // Trigger PDF Download
                                            if (handleDownloadPDF) {
                                                await handleDownloadPDF();
                                            }
                                        }}
                                        className="notification-item"
                                        style={{ borderBottom: 'none' }}
                                    >
                                        <div className="notif-title">Download PDF</div>
                                    </div>

                                    {isManager && (
                                        <div
                                            onClick={() => {
                                                setShowExportModal(false);
                                                setShowExcelModal(true);
                                            }}
                                            className="notification-item"
                                            style={{ borderTop: '1px solid var(--border-light)', borderBottom: 'none' }}
                                        >
                                            <div className="notif-title">Export to Excel</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="notification-btn"
                        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {theme === 'dark' ? (
                            <SunIcon className="w-5 h-5" />
                        ) : (
                            <MoonIcon className="w-5 h-5" />
                        )}
                    </button>

                    {/* Notifications */}
                    <div className="flex items-center">
                        <NotificationBell />
                    </div>
                </div>
            </header>

            {/* Export Modal */}
            {
                showExcelModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-6 animate-in fade-in zoom-in duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Export Report</h3>
                                <button onClick={() => setShowExcelModal(false)} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={exportStart}
                                        onChange={(e) => setExportStart(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={exportEnd}
                                        onChange={(e) => setExportEnd(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowExcelModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExport}
                                    disabled={!exportStart || !exportEnd}
                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Download Excel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
