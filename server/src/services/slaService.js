import prisma from '../config/db.js';
import { PRIORITIES, DEFAULT_SLA_POLICIES, STATUSES, ROLES } from '../config/constants.js';

/**
 * Fetch active SLA policy for a given priority
 */
export async function getSLAPolicyForPriority(priority) {
  const policy = await prisma.sLAPolicy.findUnique({
    where: { priority }
  });

  if (policy) {
    return policy;
  }

  // Fallback to default constants
  const defaultPolicy = DEFAULT_SLA_POLICIES[priority] || DEFAULT_SLA_POLICIES.MEDIUM;
  return {
    priority,
    firstResponseHours: defaultPolicy.firstResponseHours,
    resolutionHours: defaultPolicy.resolutionHours
  };
}

/**
 * Calculate response and resolution deadlines from creation timestamp
 */
export async function calculateDeadlines(priority, fromDate = new Date()) {
  const policy = await getSLAPolicyForPriority(priority);
  const baseTime = fromDate.getTime();

  const responseDeadline = new Date(baseTime + policy.firstResponseHours * 3600 * 1000);
  const resolutionDeadline = new Date(baseTime + policy.resolutionHours * 3600 * 1000);

  return {
    responseDeadline,
    resolutionDeadline,
    firstResponseHours: policy.firstResponseHours,
    resolutionHours: policy.resolutionHours
  };
}

/**
 * Calculate dynamic SLA status for a complaint
 */
export function getComplaintSLAStatus(complaint) {
  const now = new Date();
  const isResolvedOrClosed = [STATUSES.RESOLVED, STATUSES.CLOSED].includes(complaint.status);

  // If resolved, compare resolution timestamp with deadline
  if (isResolvedOrClosed) {
    const finalResolutionTime = complaint.resolvedAt || complaint.closedAt || complaint.updatedAt;
    if (complaint.resolutionDeadline && new Date(finalResolutionTime) > new Date(complaint.resolutionDeadline)) {
      return {
        status: 'BREACHED',
        label: 'Resolved Post-SLA',
        color: 'red',
        isBreached: true
      };
    }
    return {
      status: 'MET',
      label: 'Resolved Within SLA',
      color: 'emerald',
      isBreached: false
    };
  }

  // For active tickets, evaluate deadlines
  const deadline = complaint.resolutionDeadline ? new Date(complaint.resolutionDeadline) : null;
  if (!deadline) {
    return { status: 'NORMAL', label: 'On Schedule', color: 'indigo', isBreached: false };
  }

  const remainingMs = deadline.getTime() - now.getTime();

  if (remainingMs <= 0 || complaint.isOverdue) {
    const overdueMs = Math.abs(remainingMs);
    const overdueHours = Math.floor(overdueMs / (1000 * 60 * 60));
    return {
      status: 'OVERDUE',
      label: `Overdue by ${overdueHours}h`,
      color: 'rose',
      isBreached: true,
      remainingMs
    };
  }

  // At-Risk: Less than 25% remaining time or less than 1 hour remaining
  const totalWindowMs = (complaint.createdAt ? deadline.getTime() - new Date(complaint.createdAt).getTime() : 24 * 3600 * 1000);
  const ratio = remainingMs / totalWindowMs;

  if (ratio < 0.25 || remainingMs < 60 * 60 * 1000) {
    const remainingHours = Math.max(0.1, (remainingMs / (1000 * 60 * 60))).toFixed(1);
    return {
      status: 'AT_RISK',
      label: `At Risk (${remainingHours}h remaining)`,
      color: 'amber',
      isBreached: false,
      remainingMs
    };
  }

  const hoursRemaining = Math.round(remainingMs / (1000 * 60 * 60));
  return {
    status: 'NORMAL',
    label: `${hoursRemaining}h remaining`,
    color: 'emerald',
    isBreached: false,
    remainingMs
  };
}

/**
 * Idempotent SLA deadline checker and escalation service
 * Identifies overdue complaints, updates status, and logs escalation record idempotently.
 */
export async function checkAndEscalateOverdueComplaints() {
  const now = new Date();

  // Find active, unresolved complaints that have passed resolutionDeadline
  const overdueCandidates = await prisma.complaint.findMany({
    where: {
      status: {
        notIn: [STATUSES.RESOLVED, STATUSES.CLOSED]
      },
      resolutionDeadline: {
        lt: now
      }
    },
    include: {
      assignedAgent: true,
      customer: true
    }
  });

  const escalationsProcessed = [];

  for (const complaint of overdueCandidates) {
    // 1. Check if an escalation history record already exists for this complaint
    const existingEscalation = await prisma.escalationHistory.findFirst({
      where: {
        complaintId: complaint.id,
        reason: {
          contains: 'Resolution SLA Breached'
        }
      }
    });

    // 2. Mark complaint as overdue and escalated if not yet marked
    if (!complaint.isOverdue || !complaint.isEscalated) {
      await prisma.complaint.update({
        where: { id: complaint.id },
        data: {
          isOverdue: true,
          isEscalated: true,
          escalatedAt: complaint.escalatedAt || now
        }
      });
    }

    // 3. Create EscalationHistory record only if not already recorded (idempotency!)
    if (!existingEscalation) {
      const escalationRecord = await prisma.escalationHistory.create({
        data: {
          complaintId: complaint.id,
          level: 1,
          reason: `Resolution SLA Breached: Ticket ${complaint.ticketNumber} exceeded resolution deadline of ${complaint.resolutionDeadline.toISOString()}`,
          notifiedUserId: complaint.assignedAgentId || null
        }
      });

      // 4. Send notification to managers
      const managers = await prisma.user.findMany({
        where: { role: ROLES.MANAGER, isActive: true },
        select: { id: true }
      });

      const notificationData = managers.map(mgr => ({
        userId: mgr.id,
        title: `Overdue Alert: Ticket ${complaint.ticketNumber}`,
        message: `Complaint "${complaint.title}" has breached its SLA resolution deadline. Immediate escalation required.`,
        type: 'ESCALATION',
        complaintId: complaint.id
      }));

      // Also notify assigned agent if any
      if (complaint.assignedAgentId) {
        notificationData.push({
          userId: complaint.assignedAgentId,
          title: `SLA Breached: Assigned Ticket ${complaint.ticketNumber}`,
          message: `Your assigned ticket "${complaint.title}" has passed the SLA resolution deadline.`,
          type: 'ESCALATION',
          complaintId: complaint.id
        });
      }

      if (notificationData.length > 0) {
        await prisma.notification.createMany({
          data: notificationData
        });
      }

      escalationsProcessed.push({
        complaintId: complaint.id,
        ticketNumber: complaint.ticketNumber,
        escalationId: escalationRecord.id
      });
    }
  }

  return {
    checkedAt: now,
    overdueCount: overdueCandidates.length,
    newEscalationsCreated: escalationsProcessed.length,
    escalations: escalationsProcessed
  };
}
