import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendTeamsNotification } from '@/lib/teams';

// Utility: check if a date falls on a weekend (Saturday=6, Sunday=0)
function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
}

// Utility: get all weekdays in a date range
function getWeekdaysInRange(start: Date, end: Date): Date[] {
    const days: Date[] = [];
    const current = new Date(start);
    while (current <= end) {
        if (!isWeekend(current)) {
            days.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
    }
    return days;
}

// Utility: check if two date ranges have any overlapping weekdays
function hasOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
    return aStart <= bEnd && aEnd >= bStart;
}

// GET: List requests (user sees own, manager sees all)
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const viewMode = searchParams.get('view');

    const user = session.user as any;
    const where: any = {};

    // Calendar view: everyone sees all requests (read-only display)
    // Otherwise: regular users only see their own requests
    if (viewMode !== 'calendar') {
        if (user.role !== 'MANAGER') {
            where.userId = user.id;
        } else if (userId) {
            where.userId = userId;
        }
    }

    if (status) {
        where.status = status;
    }

    if (startDate && endDate) {
        where.OR = [
            {
                startDate: { gte: new Date(startDate), lte: new Date(endDate) },
            },
            {
                endDate: { gte: new Date(startDate), lte: new Date(endDate) },
            },
            {
                AND: [
                    { startDate: { lte: new Date(startDate) } },
                    { endDate: { gte: new Date(endDate) } },
                ],
            },
        ];
    }

    const requests = await prisma.timeOffRequest.findMany({
        where,
        include: {
            user: {
                select: { id: true, name: true, email: true, avatarColor: true },
            },
            approver: {
                select: { name: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(requests);
}

// POST: Create a new time-off request
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { reason, startDate, endDate, notes } = await request.json();
        const user = session.user as any;

        if (!reason || !startDate || !endDate || !notes) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        // ── Weekend validation ──
        const weekdays = getWeekdaysInRange(start, end);
        if (weekdays.length === 0) {
            return NextResponse.json(
                { error: 'Cannot apply for leave on weekends. Please select weekday dates only.' },
                { status: 400 }
            );
        }

        // Check if start or end date itself is a weekend
        if (isWeekend(start)) {
            return NextResponse.json(
                { error: 'Start date falls on a weekend. Please select a weekday.' },
                { status: 400 }
            );
        }
        if (isWeekend(end)) {
            return NextResponse.json(
                { error: 'End date falls on a weekend. Please select a weekday.' },
                { status: 400 }
            );
        }

        // ── Conflict detection ──
        // Find all existing non-rejected requests for this user that overlap with the date range
        const existingRequests = await prisma.timeOffRequest.findMany({
            where: {
                userId: user.id,
                status: { not: 'REJECTED' },
                OR: [
                    { startDate: { lte: end }, endDate: { gte: start } },
                ],
            },
        });

        // Check for conflicts based on leave type
        const HALF_DAY_REASONS = ['FIRST_HALF_PTO', 'SECOND_HALF_PTO', 'FIRST_HALF_WORK_REMOTE', 'SECOND_HALF_WORK_REMOTE'];
        const isHalfDay = HALF_DAY_REASONS.includes(reason);

        // Determine "half" category: first-half or second-half
        const isFirstHalf = reason === 'FIRST_HALF_PTO' || reason === 'FIRST_HALF_WORK_REMOTE';
        const isSecondHalf = reason === 'SECOND_HALF_PTO' || reason === 'SECOND_HALF_WORK_REMOTE';

        for (const existing of existingRequests) {
            const exStart = new Date(existing.startDate);
            const exEnd = new Date(existing.endDate);
            exStart.setHours(0, 0, 0, 0);
            exEnd.setHours(0, 0, 0, 0);

            if (!hasOverlap(start, end, exStart, exEnd)) continue;

            const existingIsHalfDay = HALF_DAY_REASONS.includes(existing.reason);
            const existingIsFirstHalf = existing.reason === 'FIRST_HALF_PTO' || existing.reason === 'FIRST_HALF_WORK_REMOTE';
            const existingIsSecondHalf = existing.reason === 'SECOND_HALF_PTO' || existing.reason === 'SECOND_HALF_WORK_REMOTE';

            // Full day vs anything = conflict
            if (!isHalfDay || !existingIsHalfDay) {
                const reasonLabel = existing.reason.replace(/_/g, ' ').toLowerCase();
                return NextResponse.json(
                    {
                        error: `Conflict: You already have a "${reasonLabel}" request from ${exStart.toLocaleDateString()} to ${exEnd.toLocaleDateString()} that overlaps with this date range.`,
                    },
                    { status: 409 }
                );
            }

            // Both are half day — conflict if same half (first+first or second+second)
            if ((isFirstHalf && existingIsFirstHalf) || (isSecondHalf && existingIsSecondHalf)) {
                const half = isFirstHalf ? 'first half' : 'second half';
                return NextResponse.json(
                    {
                        error: `Conflict: You already have a ${half} request for overlapping dates.`,
                    },
                    { status: 409 }
                );
            }
            // First half + second half = OK (no conflict)
        }

        // ── WFH balance check ──
        const WFH_REASONS = ['WORK_REMOTE', 'FIRST_HALF_WORK_REMOTE', 'SECOND_HALF_WORK_REMOTE'];
        if (WFH_REASONS.includes(reason)) {
            // Get user's balance
            const dbUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { workRemoteBalance: true },
            });

            // Calculate how many WFH days this new request will use
            const newWeekdays = getWeekdaysInRange(start, end);
            const isHalfDayWfh = reason === 'FIRST_HALF_WORK_REMOTE' || reason === 'SECOND_HALF_WORK_REMOTE';
            const newCost = newWeekdays.length * (isHalfDayWfh ? 0.5 : 1);

            // Calculate total used WFH days from existing non-rejected requests
            const existingWfh = await prisma.timeOffRequest.findMany({
                where: {
                    userId: user.id,
                    reason: { in: WFH_REASONS },
                    status: { not: 'REJECTED' },
                },
                select: { reason: true, startDate: true, endDate: true },
            });

            let usedDays = 0;
            existingWfh.forEach((r) => {
                const rStart = new Date(r.startDate);
                const rEnd = new Date(r.endDate);
                const wd = getWeekdaysInRange(rStart, rEnd);
                const isHalf = r.reason === 'FIRST_HALF_WORK_REMOTE' || r.reason === 'SECOND_HALF_WORK_REMOTE';
                usedDays += wd.length * (isHalf ? 0.5 : 1);
            });

            const balance = dbUser?.workRemoteBalance ?? 0;
            const remaining = balance - usedDays;

            if (newCost > remaining) {
                return NextResponse.json(
                    {
                        error: `Insufficient WFH balance. You have ${remaining} day(s) remaining but this request needs ${newCost} day(s).`,
                    },
                    { status: 400 }
                );
            }
        }

        const newRequest = await prisma.timeOffRequest.create({
            data: {
                userId: user.id,
                reason,
                startDate: start,
                endDate: end,
                notes,
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true, avatarColor: true },
                },
            },
        });

        // Notify all managers via In-App Notification
        const managers = await prisma.user.findMany({
            where: { role: 'MANAGER' },
        });

        await prisma.notification.createMany({
            data: managers.map((m) => ({
                userId: m.id,
                title: 'New Time-Off Request',
                message: `${user.name} has requested ${reason.replace(/_/g, ' ').toLowerCase()} from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
                link: '/approvals',
            })),
        });

        // Notify via MS Teams (Async - don't await strictly to avoid blocking response if webhook is slow)
        const teamsPayload = {
            title: 'New Time-Off Request',
            message: `**${user.name}** has requested leave.`,
            user: user.name,
            startDate: start.toLocaleDateString(),
            endDate: end.toLocaleDateString(),
            reason: reason.replace(/_/g, ' ').toLowerCase(),
            link: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/approvals?highlight=${newRequest.id}`,
        };


        // Notify via MS Teams
        // We MUST await this in Vercel/Serverless, otherwise the function freezes 
        // immediately after return and the request is never sent.
        try {
            await sendTeamsNotification(teamsPayload);
        } catch (err) {
            console.error('Teams notification error:', err);
            // We swallow the error so the user request still succeeds
        }

        return NextResponse.json(newRequest);
    } catch (error) {
        console.error('Create request error:', error);
        return NextResponse.json(
            { error: 'Something went wrong' },
            { status: 500 }
        );
    }
}

