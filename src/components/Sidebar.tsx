'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const user = session?.user as any;

    if (!user) return null;

    const isManager = user.role === 'MANAGER';

    const navItems = [
        { href: '/calendar', label: 'Calendar', icon: '📅' },
        { href: '/requests', label: 'My Requests', icon: '📝' },
        { href: '/requests/new', label: 'Apply Leave', icon: '➕' },
        { href: '/profile', label: 'My Profile', icon: '👤' },
    ];

    const managerItems = [
        { href: '/approvals', label: 'Approvals', icon: '✅' },
        { href: '/team', label: 'Team', icon: '👥' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <h1>PTO Tracker</h1>
                <span>Time Off Management</span>
            </div>

            <nav className="sidebar-nav">
                <div className="sidebar-section-label">Main</div>
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-link ${pathname === item.href ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}

                {isManager && (
                    <>
                        <div className="sidebar-section-label">Manager</div>
                        {managerItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`nav-link ${pathname === item.href ? 'active' : ''}`}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                {item.label}
                            </Link>
                        ))}
                    </>
                )}

                <div style={{ flex: 1 }} />

                <button
                    className="nav-link"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                >
                    <span className="nav-icon">🚪</span>
                    Sign Out
                </button>
            </nav>

            <Link href="/profile" className="sidebar-user" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                <div
                    className="avatar"
                    style={{ backgroundColor: user.avatarColor || '#6366f1' }}
                >
                    {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                    <div className="user-name">{user.name}</div>
                    <div className="user-role">{user.role}</div>
                </div>
            </Link>
        </aside>
    );
}
