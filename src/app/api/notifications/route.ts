import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: List notifications for current user
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;

    const notifications = await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });

    return NextResponse.json(notifications);
}

// PATCH: Mark notifications as read
export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const { ids } = await request.json();

    if (ids && Array.isArray(ids)) {
        await prisma.notification.updateMany({
            where: { id: { in: ids }, userId: user.id },
            data: { read: true },
        });
    } else {
        // Mark all as read
        await prisma.notification.updateMany({
            where: { userId: user.id, read: false },
            data: { read: true },
        });
    }

    return NextResponse.json({ success: true });
}
