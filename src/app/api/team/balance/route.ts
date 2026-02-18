import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Fetch all users with their WFH balance + used count
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user as any;
    if (user.role !== 'MANAGER') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            team: true,
            workRemoteBalance: true,
            avatarColor: true,
            requests: {
                where: {
                    reason: 'WORK_REMOTE',
                    status: { not: 'REJECTED' },
                },
                select: { startDate: true, endDate: true },
            },
        },
        orderBy: { name: 'asc' },
    });

    // Calculate used days for each user
    const result = users.map((u) => {
        let usedDays = 0;
        u.requests.forEach((r) => {
            const start = new Date(r.startDate);
            const end = new Date(r.endDate);
            const current = new Date(start);
            while (current <= end) {
                const day = current.getDay();
                if (day !== 0 && day !== 6) usedDays++;
                current.setDate(current.getDate() + 1);
            }
        });
        return {
            id: u.id,
            name: u.name,
            email: u.email,
            team: u.team,
            avatarColor: u.avatarColor,
            workRemoteBalance: u.workRemoteBalance,
            usedDays,
            remaining: u.workRemoteBalance - usedDays,
        };
    });

    return NextResponse.json(result);
}

// PATCH: Update balance for a specific user or all users
export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user as any;
    if (user.role !== 'MANAGER') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, balance, setAll } = await request.json();

    if (typeof balance !== 'number' || balance < 0) {
        return NextResponse.json({ error: 'Balance must be a non-negative number' }, { status: 400 });
    }

    if (setAll) {
        // Set balance for all users at once
        await prisma.user.updateMany({
            data: { workRemoteBalance: balance },
        });
        return NextResponse.json({ success: true, message: `Set balance to ${balance} for all users` });
    }

    if (!userId) {
        return NextResponse.json({ error: 'userId or setAll is required' }, { status: 400 });
    }

    await prisma.user.update({
        where: { id: userId },
        data: { workRemoteBalance: balance },
    });

    return NextResponse.json({ success: true });
}
