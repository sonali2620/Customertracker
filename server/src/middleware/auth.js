import prisma from '../config/db.js';
import { verifyToken } from '../utils/jwt.js';

/**
 * Authentication middleware
 * Supports both HTTP-only cookie and Authorization header (Bearer <token>)
 */
export async function authenticate(req, res, next) {
  try {
    let token = null;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No authorization token provided.'
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authorization token.'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        phone: true,
        avatar: true,
        isActive: true,
        maxWorkload: true,
        skills: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User account has been deactivated. Contact an administrator.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication verification failure.',
      error: error.message
    });
  }
}

/**
 * Authorization middleware for role checking
 * @param  {...string} roles Allowed roles (e.g. 'MANAGER', 'AGENT', 'CUSTOMER')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. You do not have permission to perform this action. Required role: ${roles.join(' or ')}.`
      });
    }

    next();
  };
}
