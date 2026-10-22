import prisma from '../config/db.js';
import { ROLES, STATUSES } from '../config/constants.js';
import { generateTicketNumber } from '../utils/ticketGenerator.js';
import { calculateSuggestedPriority } from '../services/priorityEngine.js';
import { calculateDeadlines, getComplaintSLAStatus } from '../services/slaService.js';
import { findBestAgentForComplaint } from '../services/assignmentService.js';
import { logAuditEvent } from '../services/auditService.js';
import { createNotification, notifyUsers } from '../services/notificationService.js';

/**
 * Get Paginated List of Complaints with Filters and Sorting
 */
export async function getComplaints(req, res, next) {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status,
      priority,
      categoryId,
      assignedAgentId,
      myTickets,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * take;

    const where = {};

    // 1. Role-based scoping (Critical Security Check: Insecure Direct Object Reference)
    if (req.user.role === ROLES.CUSTOMER) {
      where.customerId = req.user.id;
    } else if (req.user.role === ROLES.AGENT && (myTickets === 'true' || assignedAgentId === req.user.id)) {
      where.assignedAgentId = req.user.id;
    } else if (assignedAgentId) {
      where.assignedAgentId = assignedAgentId === 'unassigned' ? null : assignedAgentId;
    }

    // 2. Filters
    if (status) {
      where.status = status;
    }
    if (priority) {
      where.priority = priority;
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }

    // 3. Search query
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { ticketNumber: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { customer: { email: { contains: q, mode: 'insensitive' } } }
      ];
    }

    // 4. Sorting
    const orderBy = {};
    const validSortFields = ['createdAt', 'updatedAt', 'priority', 'status', 'resolutionDeadline', 'ticketNumber'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const direction = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
    orderBy[sortField] = direction;

    // 5. Query DB
    const [total, complaints] = await Promise.all([
      prisma.complaint.count({ where }),
      prisma.complaint.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          customer: {
            select: { id: true, name: true, email: true, phone: true }
          },
          category: {
            select: { id: true, name: true }
          },
          assignedAgent: {
            select: { id: true, name: true, email: true, department: true }
          },
          _count: {
            select: { comments: true, attachments: true }
          }
        }
      })
    ]);

    // Attach dynamic SLA status
    const enhancedComplaints = complaints.map(c => ({
      ...c,
      sla: getComplaintSLAStatus(c)
    }));

    return res.json({
      success: true,
      data: enhancedComplaints,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Complaint Details by ID with Timeline History
 */
export async function getComplaintById(req, res, next) {
  try {
    const { id } = req.params;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true, department: true }
        },
        category: true,
        assignedAgent: {
          select: { id: true, name: true, email: true, department: true, skills: true }
        },
        attachments: {
          include: {
            uploadedBy: { select: { id: true, name: true, role: true } }
          }
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedBy: { select: { id: true, name: true, role: true } }
          }
        },
        assignmentHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            assignedBy: { select: { id: true, name: true, role: true } },
            newAgent: { select: { id: true, name: true } },
            previousAgent: { select: { id: true, name: true } }
          }
        },
        escalationHistory: {
          orderBy: { createdAt: 'desc' }
        },
        feedback: true
      }
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint ticket not found.'
      });
    }

    // Role-based Access Check: Customer can ONLY access their own ticket
    if (req.user.role === ROLES.CUSTOMER && complaint.customerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to view this complaint.'
      });
    }

    // Fetch comments: STRICT PRIVACY RULE - Internal notes never shown to Customer!
    const commentWhere = { complaintId: id };
    if (req.user.role === ROLES.CUSTOMER) {
      commentWhere.isInternal = false;
    }

    const comments = await prisma.complaintComment.findMany({
      where: commentWhere,
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, role: true } }
      }
    });

    const slaStatus = getComplaintSLAStatus(complaint);

    return res.json({
      success: true,
      data: {
        ...complaint,
        comments,
        sla: slaStatus
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Register a New Complaint
 */
export async function createComplaint(req, res, next) {
  try {
    const {
      title,
      description,
      categoryId,
      impact = 'Moderate',
      urgency = 'Normal',
      affectedUsers = 1,
      manualPriority
    } = req.body;

    if (!title || !description || !categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and complaint category are required.'
      });
    }

    // Verify category exists
    const category = await prisma.complaintCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint category selected.'
      });
    }

    // Determine customer ID (Staff can create on behalf of customer if provided)
    let customerId = req.user.id;
    if (req.user.role !== ROLES.CUSTOMER && req.body.customerId) {
      customerId = req.body.customerId;
    }

    // Generate unique human-readable ticket number (e.g. RIQ-2026-00001)
    const ticketNumber = await generateTicketNumber();

    // 1. Calculate suggested priority using deterministic priority engine
    const priorityAnalysis = calculateSuggestedPriority({
      impact,
      urgency,
      affectedUsers: parseInt(affectedUsers, 10) || 1,
      categoryName: category.name
    });

    // Priority to assign: manual override allowed for Manager/Agent, otherwise suggested
    let finalPriority = priorityAnalysis.suggestedPriority;
    if (manualPriority && [ROLES.MANAGER, ROLES.AGENT].includes(req.user.role)) {
      finalPriority = manualPriority;
    }

    // 2. Calculate SLA deadlines in UTC
    const deadlines = await calculateDeadlines(finalPriority);

    // 3. Attempt deterministic automatic agent assignment
    const assignmentResult = await findBestAgentForComplaint(category.id, category.name);
    const assignedAgentId = assignmentResult.agent ? assignmentResult.agent.id : null;
    const initialStatus = assignedAgentId ? STATUSES.ASSIGNED : STATUSES.OPEN;

    // 4. Create in atomic database transaction
    const newComplaint = await prisma.$transaction(async (tx) => {
      const complaint = await tx.complaint.create({
        data: {
          ticketNumber,
          title: title.trim(),
          description: description.trim(),
          customerId,
          categoryId: category.id,
          priority: finalPriority,
          suggestedPriority: priorityAnalysis.suggestedPriority,
          priorityReason: priorityAnalysis.explanation,
          status: initialStatus,
          assignedAgentId,
          impact,
          urgency,
          affectedUsers: parseInt(affectedUsers, 10) || 1,
          responseDeadline: deadlines.responseDeadline,
          resolutionDeadline: deadlines.resolutionDeadline
        },
        include: {
          category: true,
          customer: { select: { id: true, name: true, email: true } },
          assignedAgent: { select: { id: true, name: true, email: true } }
        }
      });

      // Record initial status in history
      await tx.statusHistory.create({
        data: {
          complaintId: complaint.id,
          previousStatus: STATUSES.OPEN,
          newStatus: initialStatus,
          changedById: req.user.id,
          reason: `Ticket registered. Initial status: ${initialStatus}.`
        }
      });

      // Record assignment history if assigned
      if (assignedAgentId) {
        await tx.assignmentHistory.create({
          data: {
            complaintId: complaint.id,
            previousAgentId: null,
            newAgentId: assignedAgentId,
            assignedById: req.user.id,
            reason: assignmentResult.reason
          }
        });
      }

      return complaint;
    });

    // 5. Send notifications
    // Notify customer
    await createNotification({
      userId: customerId,
      title: `Complaint Registered: ${ticketNumber}`,
      message: `Your complaint "${title}" has been registered with ticket ID ${ticketNumber}.`,
      type: 'TICKET_CREATED',
      complaintId: newComplaint.id
    });

    // Notify assigned agent
    if (assignedAgentId) {
      await createNotification({
        userId: assignedAgentId,
        title: `New Ticket Assigned: ${ticketNumber}`,
        message: `Complaint "${title}" (${finalPriority} priority) has been assigned to you.`,
        type: 'ASSIGNMENT',
        complaintId: newComplaint.id
      });
    } else {
      // Alert managers that complaint is unassigned
      const managers = await prisma.user.findMany({
        where: { role: ROLES.MANAGER, isActive: true },
        select: { id: true }
      });
      await notifyUsers({
        userIds: managers.map(m => m.id),
        title: `Unassigned Complaint: ${ticketNumber}`,
        message: `Complaint "${title}" could not be auto-assigned. ${assignmentResult.reason}`,
        type: 'UNASSIGNED_ALERT',
        complaintId: newComplaint.id
      });
    }

    await logAuditEvent({
      action: 'COMPLAINT_CREATED',
      entity: 'Complaint',
      entityId: newComplaint.id,
      userId: req.user.id,
      details: {
        ticketNumber,
        priority: finalPriority,
        assignedAgentId,
        suggestedPriority: priorityAnalysis.suggestedPriority
      }
    });

    return res.status(201).json({
      success: true,
      message: `Complaint ticket ${ticketNumber} created successfully.`,
      data: newComplaint
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update Permitted Complaint Fields
 */
export async function updateComplaint(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, categoryId, priority, impact, urgency } = req.body;

    const existing = await prisma.complaint.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.'
      });
    }

    // Role verification: Customers can only edit OPEN complaints they own
    if (req.user.role === ROLES.CUSTOMER) {
      if (existing.customerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Forbidden.' });
      }
      if (existing.status !== STATUSES.OPEN) {
        return res.status(400).json({
          success: false,
          message: 'Customers can only modify complaints that are still in OPEN status.'
        });
      }
    }

    const updateData = {};
    if (title) updateData.title = title.trim();
    if (description) updateData.description = description.trim();
    if (impact) updateData.impact = impact;
    if (urgency) updateData.urgency = urgency;
    if (categoryId) updateData.categoryId = categoryId;

    // Only Managers or Agents can adjust priority
    if (priority && [ROLES.MANAGER, ROLES.AGENT].includes(req.user.role)) {
      updateData.priority = priority;
      // Recalculate SLA deadlines if priority is modified
      const deadlines = await calculateDeadlines(priority, existing.createdAt);
      updateData.responseDeadline = deadlines.responseDeadline;
      updateData.resolutionDeadline = deadlines.resolutionDeadline;
    }

    const updated = await prisma.complaint.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        customer: { select: { id: true, name: true, email: true } },
        assignedAgent: { select: { id: true, name: true, email: true } }
      }
    });

    await logAuditEvent({
      action: 'COMPLAINT_UPDATED',
      entity: 'Complaint',
      entityId: id,
      userId: req.user.id,
      details: updateData
    });

    return res.json({
      success: true,
      message: 'Complaint updated successfully.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}
