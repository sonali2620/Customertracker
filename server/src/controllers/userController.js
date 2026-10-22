import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { ROLES, STATUSES } from '../config/constants.js';
import { logAuditEvent } from '../services/auditService.js';

/**
 * Get all users (Manager only)
 */
export async function getUsers(req, res, next) {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * take;

    const where = {};
    if (role) where.role = role;
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { department: { contains: q, mode: 'insensitive' } }
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          phone: true,
          isActive: true,
          maxWorkload: true,
          skills: true,
          createdAt: true,
          _count: {
            select: {
              customerComplaints: true,
              assignedComplaints: true
            }
          }
        }
      })
    ]);

    return res.json({
      success: true,
      data: users,
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
 * Get list of Support Agents with workload metrics and skills
 */
export async function getAgents(req, res, next) {
  try {
    const agents = await prisma.user.findMany({
      where: {
        role: ROLES.AGENT,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        maxWorkload: true,
        skills: true,
        avatar: true
      }
    });

    // Compute active workloads for each agent
    const activeStatuses = [
      STATUSES.OPEN,
      STATUSES.ASSIGNED,
      STATUSES.IN_PROGRESS,
      STATUSES.WAITING_FOR_CUSTOMER,
      STATUSES.REOPENED
    ];

    const workloadCounts = await prisma.complaint.groupBy({
      by: ['assignedAgentId'],
      where: {
        assignedAgentId: { in: agents.map(a => a.id) },
        status: { in: activeStatuses }
      },
      _count: { id: true }
    });

    const workloadMap = {};
    workloadCounts.forEach(c => {
      if (c.assignedAgentId) {
        workloadMap[c.assignedAgentId] = c._count.id;
      }
    });

    const agentsWithMetrics = agents.map(agent => {
      const activeWorkload = workloadMap[agent.id] || 0;
      return {
        ...agent,
        activeWorkload,
        availableCapacity: Math.max(0, agent.maxWorkload - activeWorkload),
        isAtCapacity: activeWorkload >= agent.maxWorkload
      };
    });

    return res.json({
      success: true,
      data: agentsWithMetrics
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all active complaint categories
 */
export async function getCategories(req, res, next) {
  try {
    const categories = await prisma.complaintCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { complaints: true }
        }
      }
    });

    return res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new user (Manager only)
 */
export async function createUser(req, res, next) {
  try {
    const { name, email, password, role, department, phone, maxWorkload = 10, skills = [] } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required.'
      });
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role,
        department: department ? department.trim() : null,
        phone: phone ? phone.trim() : null,
        maxWorkload: role === ROLES.AGENT ? parseInt(maxWorkload, 10) || 10 : 0,
        skills: Array.isArray(skills) ? skills : []
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        isActive: true,
        maxWorkload: true,
        skills: true,
        createdAt: true
      }
    });

    await logAuditEvent({
      action: 'USER_CREATED_BY_ADMIN',
      entity: 'User',
      entityId: user.id,
      userId: req.user.id,
      details: { email: user.email, role: user.role }
    });

    return res.status(201).json({
      success: true,
      message: `User ${user.name} created successfully.`,
      data: user
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update user details or toggle status (Manager only)
 */
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { name, department, phone, role, isActive, maxWorkload, skills } = req.body;

    const existing = await prisma.user.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (department !== undefined) updateData.department = department;
    if (phone !== undefined) updateData.phone = phone;
    if (role && ROLES[role]) updateData.role = role;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (maxWorkload !== undefined) updateData.maxWorkload = parseInt(maxWorkload, 10) || 10;
    if (Array.isArray(skills)) updateData.skills = skills;

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        phone: true,
        isActive: true,
        maxWorkload: true,
        skills: true,
        updatedAt: true
      }
    });

    await logAuditEvent({
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: id,
      userId: req.user.id,
      details: updateData
    });

    return res.json({
      success: true,
      message: 'User profile updated.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}
