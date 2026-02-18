import { TimeOffReasonKey, RequestStatusKey } from '@/lib/constants';

export interface UserSession {
    id: string;
    name: string;
    email: string;
    role: 'USER' | 'MANAGER';
    avatarColor: string;
}

export interface TimeOffRequestData {
    id: string;
    userId: string;
    user: {
        id: string;
        name: string;
        email: string;
        avatarColor: string;
    };
    reason: TimeOffReasonKey;
    startDate: string;
    endDate: string;
    notes: string;
    status: RequestStatusKey;
    approvedById: string | null;
    approver: {
        name: string;
    } | null;
    approvalNote: string | null;
    createdAt: string;
}

export interface NotificationData {
    id: string;
    title: string;
    message: string;
    read: boolean;
    link: string | null;
    createdAt: string;
}

export interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    team: string | null;
    avatarColor: string;
    createdAt: string;
}
