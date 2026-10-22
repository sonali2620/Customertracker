import prisma from '../config/db.js';

/**
 * Generate a unique, human-readable ticket number in format: RIQ-YYYY-NNNNN
 * Example: RIQ-2026-00001
 */
export async function generateTicketNumber() {
  const currentYear = new Date().getFullYear();
  const prefix = `RIQ-${currentYear}-`;

  // Find the highest ticket number for the current year
  const lastComplaint = await prisma.complaint.findFirst({
    where: {
      ticketNumber: {
        startsWith: prefix
      }
    },
    orderBy: {
      ticketNumber: 'desc'
    },
    select: {
      ticketNumber: true
    }
  });

  let nextSequence = 1;
  if (lastComplaint && lastComplaint.ticketNumber) {
    const parts = lastComplaint.ticketNumber.split('-');
    if (parts.length === 3) {
      const parsedSeq = parseInt(parts[2], 10);
      if (!isNaN(parsedSeq)) {
        nextSequence = parsedSeq + 1;
      }
    }
  }

  const paddedSequence = String(nextSequence).padStart(5, '0');
  return `${prefix}${paddedSequence}`;
}
