import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { ROLES } from '../config/constants.js';
import { signToken, setAuthCookie, clearAuthCookie } from '../utils/jwt.js';
import { logAuditEvent } from '../services/auditService.js';

/**
 * Register a new customer or staff member
 */
export async function register(req, res, next) {
  try {
    const { name, email, password, phone, department, role = ROLES.CUSTOMER } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters in length.'
      });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Role restrictions: public registration can only create CUSTOMER.
    // AGENT or MANAGER roles require existing manager authentication.
    let assignedRole = ROLES.CUSTOMER;
    if (role && (role === ROLES.AGENT || role === ROLES.MANAGER)) {
      if (req.user && req.user.role === ROLES.MANAGER) {
        assignedRole = role;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: assignedRole,
        phone: phone ? phone.trim() : null,
        department: department ? department.trim() : null,
        maxWorkload: assignedRole === ROLES.AGENT ? 10 : 0
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        phone: true,
        createdAt: true
      }
    });

    // Auto-login for newly registered customer
    const token = signToken(user);
    setAuthCookie(res, token);

    await logAuditEvent({
      action: 'USER_REGISTERED',
      entity: 'User',
      entityId: user.id,
      userId: user.id,
      details: { email: user.email, role: user.role }
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Log in with email and password
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = signToken(user);
    setAuthCookie(res, token);

    await logAuditEvent({
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user.id,
      userId: user.id,
      ipAddress: req.ip
    });

    const userProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      phone: user.phone,
      avatar: user.avatar,
      skills: user.skills,
      maxWorkload: user.maxWorkload
    };

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: userProfile
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Log out and clear authentication cookies
 */
export async function logout(req, res) {
  clearAuthCookie(res);
  return res.json({
    success: true,
    message: 'Logged out successfully.'
  });
}

/**
 * Get current authenticated user profile
 */
export async function getCurrentUser(req, res) {
  return res.json({
    success: true,
    user: req.user
  });
}

/**
 * Change user password
 */
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Both current password and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters in length.'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'The current password you entered is incorrect.'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    await logAuditEvent({
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: req.user.id,
      userId: req.user.id
    });

    return res.json({
      success: true,
      message: 'Password updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}
