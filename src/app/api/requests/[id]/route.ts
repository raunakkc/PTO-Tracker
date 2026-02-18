import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH: Approve/reject (manager) or Edit (owner)
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;

    try {
        const { id } = await params;
        const body = await request.json();

        const existingRequest = await prisma.timeOffRequest.findUnique({
            where: { id },
            include: { user: true },
        });

        if (!existingRequest) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // ── Manager approval/rejection ──
        if (body.status && ['APPROVED', 'REJECTED'].includes(body.status)) {
            if (user.role !== 'MANAGER') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            const updated = await prisma.timeOffRequest.update({
                where: { id },
                data: {
                    status: body.status,
                    approvedById: user.id,
                    approvalNote: body.approvalNote || null,
                },
                include: {
                    user: { select: { id: true, name: true, email: true, avatarColor: true } },
                    approver: { select: { name: true } },
                },
            });

            // Notify the requesting user
            await prisma.notification.create({
                data: {
                    userId: existingRequest.userId,
                    title: `Request ${body.status.toLowerCase()}`,
                    message: `Your ${existingRequest.reason.replace(/_/g, ' ').toLowerCase()} request has been ${body.status.toLowerCase()} by ${user.name}${body.approvalNote ? ': ' + body.approvalNote : ''}`,
                    link: '/requests',
                },
            });

            return NextResponse.json(updated);
        }

        // ── User editing their own request ──
        if (existingRequest.userId !== user.id) {
            return NextResponse.json({ error: 'You can only edit your own requests' }, { status: 403 });
        }

        const { reason, startDate, endDate, notes } = body;

        if (!reason || !startDate || !endDate || !notes) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        // Weekend validation
        const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
        if (isWeekend(start)) {
            return NextResponse.json({ error: 'Start date falls on a weekend.' }, { status: 400 });
        }
        if (isWeekend(end)) {
            return NextResponse.json({ error: 'End date falls on a weekend.' }, { status: 400 });
        }

        // Conflict detection (exclude current request from check)
        const overlapping = await prisma.timeOffRequest.findMany({
            where: {
                userId: user.id,
                id: { not: id },
                status: { not: 'REJECTED' },
                OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
            },
        });

        const newIsHalfDay = reason === 'FIRST_HALF_PTO' || reason === 'SECOND_HALF_PTO';

        for (const existing of overlapping) {
            const exStart = new Date(existing.startDate);
            const exEnd = new Date(existing.endDate);
            exStart.setHours(0, 0, 0, 0);
            exEnd.setHours(0, 0, 0, 0);

            if (!(start <= exEnd && end >= exStart)) continue;

            const existingIsHalfDay = existing.reason === 'FIRST_HALF_PTO' || existing.reason === 'SECOND_HALF_PTO';

            if (!newIsHalfDay || !existingIsHalfDay) {
                return NextResponse.json(
                    { error: `Conflict: Overlapping leave request exists for those dates.` },
                    { status: 409 }
                );
            }

            if (reason === existing.reason) {
                return NextResponse.json(
                    { error: `Conflict: Same half-day PTO already exists for overlapping dates.` },
                    { status: 409 }
                );
            }
        }

        // Update request — reset to PENDING for re-approval
        const updated = await prisma.timeOffRequest.update({
            where: { id },
            data: {
                reason,
                startDate: start,
                endDate: end,
                notes,
                status: 'PENDING',
                approvedById: null,
                approvalNote: null,
            },
            include: {
                user: { select: { id: true, name: true, email: true, avatarColor: true } },
                approver: { select: { name: true } },
            },
        });

        // Notify managers about the edit
        const managers = await prisma.user.findMany({ where: { role: 'MANAGER' } });
        await prisma.notification.createMany({
            data: managers.map((m) => ({
                userId: m.id,
                title: 'Request Edited',
                message: `${user.name} has edited their ${reason.replace(/_/g, ' ').toLowerCase()} request (${start.toLocaleDateString()} - ${end.toLocaleDateString()}). It requires re-approval.`,
                link: '/approvals',
            })),
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Update request error:', error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}

// DELETE: Delete a request (owner or manager) — notifies managers
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const { id } = await params;

    const existingRequest = await prisma.timeOffRequest.findUnique({
        where: { id },
        include: { user: { select: { name: true } } },
    });

    if (!existingRequest) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Only managers or the request owner can delete
    if (user.role !== 'MANAGER' && existingRequest.userId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.timeOffRequest.delete({ where: { id } });

    // Notify managers about the deletion
    const managers = await prisma.user.findMany({ where: { role: 'MANAGER' } });
    const requesterName = existingRequest.user.name;
    const reasonLabel = existingRequest.reason.replace(/_/g, ' ').toLowerCase();
    const startStr = new Date(existingRequest.startDate).toLocaleDateString();
    const endStr = new Date(existingRequest.endDate).toLocaleDateString();

    await prisma.notification.createMany({
        data: managers
            .filter((m) => m.id !== user.id) // Don't notify yourself
            .map((m) => ({
                userId: m.id,
                title: 'Request Deleted',
                message: `${user.id === existingRequest.userId ? requesterName + ' has cancelled' : user.name + ' has deleted'} the ${reasonLabel} request (${startStr} - ${endStr}).`,
                link: '/approvals',
            })),
    });

    // If a user deletes their own request and it was approved, notify the user too (confirmation)
    // If manager deleted someone else's request, notify the owner
    if (user.id !== existingRequest.userId) {
        await prisma.notification.create({
            data: {
                userId: existingRequest.userId,
                title: 'Request Deleted by Manager',
                message: `Your ${reasonLabel} request (${startStr} - ${endStr}) has been deleted by ${user.name}.`,
                link: '/requests',
            },
        });
    }

    return NextResponse.json({ success: true });
}
