
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'MANAGER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
        return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
    }

    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Ensure full coverage of the end date
        end.setHours(23, 59, 59, 999);

        // Fetch requests within range
        const requests = await prisma.timeOffRequest.findMany({
            where: {
                OR: [
                    { startDate: { gte: start, lte: end } },
                    { endDate: { gte: start, lte: end } },
                    { AND: [{ startDate: { lte: start } }, { endDate: { gte: end } }] }
                ]
            },
            include: {
                user: true,
                approver: true
            },
            orderBy: { startDate: 'asc' }
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Time Off Report');

        sheet.columns = [
            { header: 'Employee Name', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Role', key: 'role', width: 15 },
            { header: 'Leave Type', key: 'reason', width: 25 },
            { header: 'Start Date', key: 'startDate', width: 15 },
            { header: 'End Date', key: 'endDate', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Approved By', key: 'approver', width: 20 },
            { header: 'Notes', key: 'notes', width: 40 },
        ];

        // Style the header
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        requests.forEach(req => {
            sheet.addRow({
                name: req.user.name,
                email: req.user.email,
                role: req.user.role,
                reason: req.reason.replace(/_/g, ' '),
                startDate: req.startDate.toLocaleDateString(),
                endDate: req.endDate.toLocaleDateString(),
                status: req.status,
                approver: req.approver?.name || '-',
                notes: req.notes || ''
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="PTO_Report_${startDate}_to_${endDate}.xlsx"`
            }
        });

    } catch (error) {
        console.error('Excel Export Error:', error);
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
    }
}
