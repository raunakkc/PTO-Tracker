import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH: Update user role or reset password
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = session.user as any;
    if (currentUser.role !== 'MANAGER') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const updateData: any = {};

        if (body.role && ['USER', 'MANAGER'].includes(body.role)) {
            updateData.role = body.role;
        }

        if (body.newPassword) {
            updateData.password = await bcrypt.hash(body.newPassword, 12);
        }

        const updated = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarColor: true,
            },
        });

        // Notify user about role change
        if (body.role) {
            await prisma.notification.create({
                data: {
                    userId: id,
                    title: 'Role Updated',
                    message: `Your role has been changed to ${body.role} by ${currentUser.name}`,
                    link: '/team',
                },
            });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json(
            { error: 'Something went wrong' },
            { status: 500 }
        );
    }
}

// DELETE: Remove a team member
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = session.user as any;
    if (currentUser.role !== 'MANAGER') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    if (id === currentUser.id) {
        return NextResponse.json(
            { error: 'Cannot remove yourself' },
            { status: 400 }
        );
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
}
