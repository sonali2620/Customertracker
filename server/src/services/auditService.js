import prisma from '../config/db.js';

/**
 * Log actions to AuditLog table
 */
export async function logAuditEvent({ action, entity, entityId = null, userId = null, details = null, ipAddress = null }) {
  try {
    const detailsString = typeof details === 'object' && details !== null 
      ? JSON.stringify(details) 
      : details;

    return await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId: entityId ? String(entityId) : null,
        userId,
        details: detailsString,
        ipAddress
      }
    });
  } catch (error) {
    // Non-blocking error logging for audits
    console.error('[AuditLog Error]', error);
    return null;
  }
}
