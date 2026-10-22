import prisma from '../config/db.js';
import { ROLES } from '../config/constants.js';

/**
 * Export filtered complaints as a downloadable CSV file
 */
export async function exportComplaintsCSV(req, res, next) {
  try {
    const { status, priority, categoryId, dateFrom, dateTo } = req.query;

    const where = {};

    // Customer scoping
    if (req.user.role === ROLES.CUSTOMER) {
      where.customerId = req.user.id;
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = categoryId;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }

    const complaints = await prisma.complaint.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, email: true } },
        category: { select: { name: true } },
        assignedAgent: { select: { name: true, email: true } },
        feedback: { select: { rating: true } }
      }
    });

    // Helper to safely escape CSV cell content
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    // CSV Headers
    const headers = [
      'Ticket Number',
      'Title',
      'Category',
      'Priority',
      'Status',
      'Customer Name',
      'Customer Email',
      'Assigned Agent',
      'Created At (UTC)',
      'First Response At (UTC)',
      'Resolution Deadline (UTC)',
      'Resolved At (UTC)',
      'Is Overdue',
      'CSAT Rating'
    ];

    const rows = complaints.map(c => [
      escapeCSV(c.ticketNumber),
      escapeCSV(c.title),
      escapeCSV(c.category?.name || 'Unassigned'),
      escapeCSV(c.priority),
      escapeCSV(c.status),
      escapeCSV(c.customer?.name || ''),
      escapeCSV(c.customer?.email || ''),
      escapeCSV(c.assignedAgent?.name || 'Unassigned'),
      escapeCSV(c.createdAt ? new Date(c.createdAt).toISOString() : ''),
      escapeCSV(c.firstResponseAt ? new Date(c.firstResponseAt).toISOString() : ''),
      escapeCSV(c.resolutionDeadline ? new Date(c.resolutionDeadline).toISOString() : ''),
      escapeCSV(c.resolvedAt ? new Date(c.resolvedAt).toISOString() : ''),
      escapeCSV(c.isOverdue ? 'YES' : 'NO'),
      escapeCSV(c.feedback?.rating || 'N/A')
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    const filename = `resolveiq-complaints-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
}
