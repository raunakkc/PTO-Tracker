'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { NotificationData } from '@/types';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationBell() {
    const { data: session } = useSession();
    const router = useRouter();
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter((n) => !n.read).length;

    useEffect(() => {
        if (!session?.user) return;
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 15000);
        return () => clearInterval(interval);
    }, [session]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    async function fetchNotifications() {
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch { }
    }

    async function markAllRead() {
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        } catch { }
    }

    function handleNotificationClick(notif: NotificationData) {
        if (notif.link) {
            router.push(notif.link);
        }
        setIsOpen(false);
    }

    return (
        <div ref={dropdownRef} className="relative flex items-center">
            <button
                className="notification-btn"
                onClick={() => setIsOpen(!isOpen)}
                title="Notifications"
            >
                🔔
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-dropdown-header">
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
                                Mark all read
                            </button>
                        )}
                    </div>
                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                No notifications yet
                            </div>
                        ) : (
                            notifications.slice(0, 20).map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`notification-item ${!notif.read ? 'unread' : ''}`}
                                    onClick={() => handleNotificationClick(notif)}
                                >
                                    <div className="notif-title">{notif.title}</div>
                                    <div className="notif-message">{notif.message}</div>
                                    <div className="notif-time">
                                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
