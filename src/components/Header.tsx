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
                    <div className="modal-overlay">
                        <div className="modal">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Export Report</h2>
                                <button onClick={() => setShowExcelModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                                    <XMarkIcon className="h-6 w-6" style={{ width: '24px', height: '24px' }} />
                                </button>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Start Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={exportStart}
                                    onChange={(e) => setExportStart(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">End Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={exportEnd}
                                    onChange={(e) => setExportEnd(e.target.value)}
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    onClick={() => setShowExcelModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExport}
                                    disabled={!exportStart || !exportEnd}
                                    className="btn btn-primary"
                                    style={{ opacity: (!exportStart || !exportEnd) ? 0.5 : 1, cursor: (!exportStart || !exportEnd) ? 'not-allowed' : 'pointer' }}
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
