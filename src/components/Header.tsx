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
            <header
                className="fixed top-0 z-30 flex items-center h-16 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md transition-all duration-200"
                style={{ left: 'var(--sidebar-width)', right: 0 }}
            >
                <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                    {/* Left: Title */}
                    <div className="flex-shrink-0">
                        <h1 className="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl ml-4 sm:ml-0">
                            {title}
                        </h1>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-4">

                        {/* Export Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowExportModal(!showExportModal)}
                                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                                title="Export Data"
                            >
                                <ArrowDownTrayIcon className="w-6 h-6" />
                            </button>

                            {/* Export Menu */}
                            {showExportModal && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50 animate-in fade-in slide-in-from-top-2">
                                    <button
                                        onClick={async () => {
                                            setShowExportModal(false);
                                            // Trigger PDF Download
                                            if (handleDownloadPDF) {
                                                await handleDownloadPDF();
                                            }
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Download PDF
                                    </button>

                                    {isManager && (
                                        <button
                                            onClick={() => {
                                                setShowExportModal(false);
                                                setShowExcelModal(true);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            Export to Excel
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {theme === 'dark' ? (
                                <SunIcon className="w-6 h-6" />
                            ) : (
                                <MoonIcon className="w-6 h-6" />
                            )}
                        </button>

                        {/* Notifications */}
                        <div className="flex items-center">
                            <NotificationBell />
                        </div>
                    </div>
                </div>
            </header>

            {/* Export Modal */}
            {showExcelModal && (
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
            )}
        </>
    );
}
