import prisma from '../config/db.js';
import { ROLES, STATUSES, PRIORITIES } from '../config/constants.js';

/**
 * Get Comprehensive Dashboard & Analytics Metrics
 */
export async function getDashboardMetrics(req, res, next) {
  try {
    const { dateFrom, dateTo } = req.query;

    const where = {};

    // Customer scoping
    if (req.user.role === ROLES.CUSTOMER) {
      where.customerId = req.user.id;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }

    // 1. KPI Counts
    const [
      totalComplaints,
      openComplaints,
      criticalComplaints,
      overdueComplaints,
      resolvedComplaints,
      reopenedComplaints
    ] = await Promise.all([
      prisma.complaint.count({ where }),
      prisma.complaint.count({
        where: {
          ...where,
          status: { in: [STATUSES.OPEN, STATUSES.ASSIGNED, STATUSES.IN_PROGRESS, STATUSES.WAITING_FOR_CUSTOMER] }
        }
      }),
      prisma.complaint.count({
        where: {
          ...where,
          priority: PRIORITIES.CRITICAL,
          status: { notIn: [STATUSES.RESOLVED, STATUSES.CLOSED] }
        }
      }),
      prisma.complaint.count({
        where: {
          ...where,
          status: { notIn: [STATUSES.RESOLVED, STATUSES.CLOSED] },
          resolutionDeadline: { lt: new Date() }
        }
      }),
      prisma.complaint.count({
        where: {
          ...where,
          status: { in: [STATUSES.RESOLVED, STATUSES.CLOSED] }
        }
      }),
      prisma.complaint.count({
        where: {
          ...where,
          reopenedCount: { gt: 0 }
        }
      })
    ]);

    // 2. Average Resolution & First Response Times
    const resolvedRecords = await prisma.complaint.findMany({
      where: {
        ...where,
        resolvedAt: { not: null }
      },
      select: {
        createdAt: true,
        resolvedAt: true,
        firstResponseAt: true,
        resolutionDeadline: true
      }
    });

    let totalResolutionHours = 0;
    let resolvedWithinSLA = 0;

    resolvedRecords.forEach(r => {
      const durationHours = (new Date(r.resolvedAt).getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60);
      totalResolutionHours += Math.max(0, durationHours);

      if (r.resolutionDeadline && new Date(r.resolvedAt) <= new Date(r.resolutionDeadline)) {
        resolvedWithinSLA += 1;
      }
    });

    const avgResolutionHours = resolvedRecords.length > 0
      ? (totalResolutionHours / resolvedRecords.length).toFixed(1)
      : '0.0';

    const slaComplianceRate = resolvedRecords.length > 0
      ? Math.round((resolvedWithinSLA / resolvedRecords.length) * 100)
      : 100;

    // First Response calculations
    const responseRecords = await prisma.complaint.findMany({
      where: {
        ...where,
        firstResponseAt: { not: null }
      },
      select: {
        createdAt: true,
        firstResponseAt: true
      }
    });

    let totalResponseHours = 0;
    responseRecords.forEach(r => {
      const diffHours = (new Date(r.firstResponseAt).getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60);
      totalResponseHours += Math.max(0, diffHours);
    });

    const avgFirstResponseHours = responseRecords.length > 0
      ? (totalResponseHours / responseRecords.length).toFixed(1)
      : '0.0';

    const reopenRate = totalComplaints > 0
      ? Math.round((reopenedComplaints / totalComplaints) * 100)
      : 0;

    // 3. Customer Satisfaction Average (CSAT)
    const feedbackWhere = {};
    if (req.user.role === ROLES.CUSTOMER) {
      feedbackWhere.customerId = req.user.id;
    }

    const feedbacks = await prisma.feedback.findMany({
      where: feedbackWhere,
      select: { rating: true }
    });

    const totalRatings = feedbacks.length;
    const avgRating = totalRatings > 0
      ? (feedbacks.reduce((acc, f) => acc + f.rating, 0) / totalRatings).toFixed(1)
      : '0.0';

    // 4. Breakdown by Category
    const categoryCounts = await prisma.complaint.groupBy({
      by: ['categoryId'],
      where,
      _count: { id: true }
    });

    const categories = await prisma.complaintCategory.findMany({
      select: { id: true, name: true }
    });
    const categoryMap = {};
    categories.forEach(c => { categoryMap[c.id] = c.name; });

    const byCategory = categoryCounts.map(item => ({
      name: categoryMap[item.categoryId] || 'Unknown',
      count: item._count.id
    })).sort((a, b) => b.count - a.count);

    // 5. Breakdown by Priority
    const priorityCounts = await prisma.complaint.groupBy({
      by: ['priority'],
      where,
      _count: { id: true }
    });

    const byPriority = priorityCounts.map(item => ({
      priority: item.priority,
      count: item._count.id
    }));

    // 6. Breakdown by Status
    const statusCounts = await prisma.complaint.groupBy({
      by: ['status'],
      where,
      _count: { id: true }
    });

    const byStatus = statusCounts.map(item => ({
      status: item.status,
      count: item._count.id
    }));

    // 7. Recent Activity / Complaints
    const recentComplaints = await prisma.complaint.findMany({
      where,
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, email: true } },
        category: { select: { name: true } },
        assignedAgent: { select: { name: true } }
      }
    });

    // 8. Agent Workload and Resolution Metrics (for Managers & Agents)
    let agentPerformance = [];
    if (req.user.role !== ROLES.CUSTOMER) {
      const agents = await prisma.user.findMany({
        where: { role: ROLES.AGENT, isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          maxWorkload: true
        }
      });

      const agentComplaints = await prisma.complaint.findMany({
        where: {
          assignedAgentId: { in: agents.map(a => a.id) }
        },
        select: {
          assignedAgentId: true,
          status: true,
          resolvedAt: true,
          resolutionDeadline: true
        }
      });

      agentPerformance = agents.map(agent => {
        const tickets = agentComplaints.filter(t => t.assignedAgentId === agent.id);
        const activeCount = tickets.filter(t => [STATUSES.OPEN, STATUSES.ASSIGNED, STATUSES.IN_PROGRESS, STATUSES.WAITING_FOR_CUSTOMER, STATUSES.REOPENED].includes(t.status)).length;
        const resolvedCount = tickets.filter(t => [STATUSES.RESOLVED, STATUSES.CLOSED].includes(t.status)).length;
        const withinSLACount = tickets.filter(t => [STATUSES.RESOLVED, STATUSES.CLOSED].includes(t.status) && t.resolvedAt && t.resolutionDeadline && new Date(t.resolvedAt) <= new Date(t.resolutionDeadline)).length;

        return {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          department: agent.department,
          activeWorkload: activeCount,
          maxCapacity: agent.maxWorkload,
          totalResolved: resolvedCount,
          slaCompliance: resolvedCount > 0 ? Math.round((withinSLACount / resolvedCount) * 100) : 100
        };
      });
    }

    // 9. Complaints Creation Trends (Last 7 days or periods)
    // Fetch last 30 days complaints to construct daily trend
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendRecords = await prisma.complaint.findMany({
      where: {
        ...where,
        createdAt: { gte: thirtyDaysAgo }
      },
      select: {
        createdAt: true,
        status: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Bucket by date (YYYY-MM-DD)
    const trendsMap = {};
    trendRecords.forEach(r => {
      const day = new Date(r.createdAt).toISOString().split('T')[0];
      if (!trendsMap[day]) {
        trendsMap[day] = { date: day, total: 0, resolved: 0 };
      }
      trendsMap[day].total += 1;
      if ([STATUSES.RESOLVED, STATUSES.CLOSED].includes(r.status)) {
        trendsMap[day].resolved += 1;
      }
    });

    const trends = Object.values(trendsMap);

    return res.json({
      success: true,
      data: {
        summary: {
          totalComplaints,
          openComplaints,
          criticalComplaints,
          overdueComplaints,
          resolvedComplaints,
          avgResolutionHours,
          avgFirstResponseHours,
          slaComplianceRate,
          reopenRate,
          csatAverage: avgRating,
          csatTotalReviews: totalRatings
        },
        charts: {
          byCategory,
          byPriority,
          byStatus,
          trends
        },
        recentComplaints,
        agentPerformance
      }
    });
  } catch (error) {
    next(error);
  }
}
