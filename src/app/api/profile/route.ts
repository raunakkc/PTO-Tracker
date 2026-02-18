import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TEAMS } from '@/lib/constants';

// GET /api/profile — get current user's profile
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { id: (session.user as any).id },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            team: true,
            avatarColor: true,
            createdAt: true,
        },
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
}

// PATCH /api/profile — update current user's name and/or team
export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, team } = body;

    const updateData: Record<string, string | null> = {};

    if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length < 2) {
            return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
        }
        updateData.name = name.trim();
    }

    if (team !== undefined) {
        if (team !== null && !TEAMS.includes(team)) {
            return NextResponse.json({ error: 'Invalid team' }, { status: 400 });
        }
        updateData.team = team;
    }

    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updated = await prisma.user.update({
        where: { id: (session.user as any).id },
        data: updateData,
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            team: true,
            avatarColor: true,
        },
    });

    return NextResponse.json(updated);
}
