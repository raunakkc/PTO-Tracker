export const TIME_OFF_REASONS = {
    WORK_REMOTE: {
        label: 'Work Remote',
        type: 'FULL_DAY',
        color: '#22c55e',
        lightColor: '#dcfce7',
        textColor: '#166534',
    },
    FIRST_HALF_WORK_REMOTE: {
        label: '1st Half WFH',
        type: 'HALF_DAY',
        color: '#10b981',
        lightColor: '#d1fae5',
        textColor: '#065f46',
    },
    SECOND_HALF_WORK_REMOTE: {
        label: '2nd Half WFH',
        type: 'HALF_DAY',
        color: '#34d399',
        lightColor: '#a7f3d0',
        textColor: '#047857',
    },
    PTO: {
        label: 'PTO',
        type: 'FULL_DAY',
        color: '#ec4899',
        lightColor: '#fce7f3',
        textColor: '#9d174d',
    },
    FIRST_HALF_PTO: {
        label: 'First Half PTO',
        type: 'HALF_DAY',
        color: '#eab308',
        lightColor: '#fef9c3',
        textColor: '#854d0e',
    },
    SECOND_HALF_PTO: {
        label: 'Second Half PTO',
        type: 'HALF_DAY',
        color: '#f97316',
        lightColor: '#ffedd5',
        textColor: '#9a3412',
    },
} as const;

export type TimeOffReasonKey = keyof typeof TIME_OFF_REASONS;

export const REQUEST_STATUS = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
} as const;

export type RequestStatusKey = keyof typeof REQUEST_STATUS;

export const TEAMS = [
    'DBC',
    'Technical Architecture',
    'SPW',
    'Surepods',
    'Div-7',
    'Virtual Mockup',
] as const;

export type TeamName = typeof TEAMS[number];

// Helper: is this reason a work-remote type?
export function isWorkRemoteReason(reason: string): boolean {
    return reason === 'WORK_REMOTE' || reason === 'FIRST_HALF_WORK_REMOTE' || reason === 'SECOND_HALF_WORK_REMOTE';
}

// Helper: WFH cost in days (half-day = 0.5, full = 1)
export function getWfhCost(reason: string): number {
    if (reason === 'FIRST_HALF_WORK_REMOTE' || reason === 'SECOND_HALF_WORK_REMOTE') return 0.5;
    if (reason === 'WORK_REMOTE') return 1;
    return 0;
}
