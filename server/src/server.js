import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import prisma from './config/db.js';
import { checkAndEscalateOverdueComplaints } from './services/slaService.js';

const PORT = process.env.PORT || 5000;
const SLA_CHECK_INTERVAL_MS = parseInt(process.env.SLA_CHECK_INTERVAL_MS, 10) || 60000; // default 60s

// Start HTTP Server
const server = app.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`🚀 ResolveIQ API Server running on port ${PORT}`);
  console.log(`📡 Base API URL: http://localhost:${PORT}/api/v1`);
  console.log(`🕒 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=======================================================`);

  // Run initial SLA escalation check on startup
  try {
    const initCheck = await checkAndEscalateOverdueComplaints();
    console.log(`[SLA Monitor] Initial escalation check: ${initCheck.overdueCount} overdue tickets found, ${initCheck.newEscalationsCreated} escalations logged.`);
  } catch (err) {
    console.error('[SLA Monitor] Error running initial check:', err.message);
  }
});

// Periodic SLA Escalation Background Job
const slaInterval = setInterval(async () => {
  try {
    const result = await checkAndEscalateOverdueComplaints();
    if (result.newEscalationsCreated > 0) {
      console.log(`[SLA Monitor] Periodic scan: Escalate ${result.newEscalationsCreated} tickets.`);
    }
  } catch (err) {
    console.error('[SLA Monitor] Periodic check error:', err.message);
  }
}, SLA_CHECK_INTERVAL_MS);

// Graceful Shutdown
async function shutdown() {
  console.log('Shutting down ResolveIQ API server gracefully...');
  clearInterval(slaInterval);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Server and database disconnected.');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
