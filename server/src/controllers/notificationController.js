import prisma from '../config/db.js';

/**
 * Get current user's notifications
 */
export async function getMyNotifications(req, res, next) {
  try {
    const { unreadOnly = 'false', limit = 30 } = req.query;

    const where = { userId: req.user.id };
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        take: parseInt(limit, 10) || 30,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.notification.count({
        where: { userId: req.user.id, isRead: false }
      })
    ]);

    return res.json({
      success: true,
      unreadCount,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    return res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark all user notifications as read
 */
export async function markAllAsRead(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });

    return res.json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (error) {
    next(error);
  }
}
