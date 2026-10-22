import prisma from '../config/db.js';
import { checkAndEscalateOverdueComplaints } from '../services/slaService.js';
import { logAuditEvent } from '../services/auditService.js';

/**
 * Get all configured SLA policies
 */
export async function getSLAPolicies(req, res, next) {
  try {
    const policies = await prisma.sLAPolicy.findMany({
      orderBy: { priority: 'asc' }
    });

    return res.json({
      success: true,
      data: policies
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update SLA Policy (Manager only)
 */
export async function updateSLAPolicy(req, res, next) {
  try {
    const { priority } = req.params;
    const { firstResponseHours, resolutionHours, description } = req.body;

    const parsedFirstResponse = parseFloat(firstResponseHours);
    const parsedResolution = parseFloat(resolutionHours);

    if (isNaN(parsedFirstResponse) || parsedFirstResponse <= 0) {
      return res.status(400).json({
        success: false,
        message: 'firstResponseHours must be a positive number.'
      });
    }

    if (isNaN(parsedResolution) || parsedResolution <= 0) {
      return res.status(400).json({
        success: false,
        message: 'resolutionHours must be a positive number.'
      });
    }

    const existingPolicy = await prisma.sLAPolicy.findUnique({ where: { priority } });
    let updated;
    if (existingPolicy) {
      updated = await prisma.sLAPolicy.update({
        where: { priority },
        data: {
          firstResponseHours: parsedFirstResponse,
          resolutionHours: parsedResolution,
          description: description || undefined
        }
      });
    } else {
      updated = await prisma.sLAPolicy.create({
        data: {
          priority,
          firstResponseHours: parsedFirstResponse,
          resolutionHours: parsedResolution,
          description: description || `Standard SLA Policy for ${priority}`
        }
      });
    }

    await logAuditEvent({
      action: 'SLA_POLICY_UPDATED',
      entity: 'SLAPolicy',
      entityId: updated.id,
      userId: req.user.id,
      details: { priority, firstResponseHours: parsedFirstResponse, resolutionHours: parsedResolution }
    });

    return res.json({
      success: true,
      message: `SLA policy for ${priority} priority updated.`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Trigger SLA Escalation Verification
 * Checks for overdue tickets and idempotently escalates them.
 */
export async function triggerEscalationCheck(req, res, next) {
  try {
    const result = await checkAndEscalateOverdueComplaints();

    await logAuditEvent({
      action: 'MANUAL_SLA_CHECK_TRIGGERED',
      entity: 'System',
      userId: req.user.id,
      details: result
    });

    return res.json({
      success: true,
      message: `SLA escalation run complete. Identified ${result.overdueCount} overdue tickets, created ${result.newEscalationsCreated} new escalations.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Escalation History Log
 */
export async function getEscalations(req, res, next) {
  try {
    const escalations = await prisma.escalationHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        complaint: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            priority: true,
            status: true,
            resolutionDeadline: true,
            assignedAgent: { select: { id: true, name: true } },
            customer: { select: { id: true, name: true } }
          }
        }
      }
    });

    return res.json({
      success: true,
      data: escalations
    });
  } catch (error) {
    next(error);
  }
}
