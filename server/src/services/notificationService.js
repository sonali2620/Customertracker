import prisma from '../config/db.js';

/**
 * Create an in-app notification for a user
 */
export async function createNotification({ userId, title, message, type = 'GENERAL', complaintId = null }) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        complaintId
      }
    });
  } catch (error) {
    console.error('[Notification Error]', error);
    return null;
  }
}

/**
 * Send notification to multiple users (e.g. all managers)
 */
export async function notifyUsers({ userIds, title, message, type = 'GENERAL', complaintId = null }) {
  try {
    if (!userIds || userIds.length === 0) return [];

    const data = userIds.map(userId => ({
      userId,
      title,
      message,
      type,
      complaintId
    }));

    return await prisma.notification.createMany({
      data
    });
  } catch (error) {
    console.error('[Notification Batch Error]', error);
    return null;
  }
}
