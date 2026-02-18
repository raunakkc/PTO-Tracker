'use client';

import NotificationBell from './NotificationBell';
import { useTheme } from './ThemeProvider';

interface HeaderProps {
    title: string;
}

export default function Header({ title }: HeaderProps) {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="header">
            <h1 className="header-title">{title}</h1>
            <div className="header-actions">
                <button
                    className="btn btn-ghost btn-icon theme-toggle"
                    onClick={toggleTheme}
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    aria-label="Toggle theme"
                >
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                <NotificationBell />
            </div>
        </header>
    );
}
