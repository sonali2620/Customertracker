import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import { calculateSuggestedPriority } from '../src/services/priorityEngine.js';
import { calculateDeadlines, getComplaintSLAStatus } from '../src/services/slaService.js';
import { PRIORITIES, STATUSES, VALID_TRANSITIONS } from '../src/config/constants.js';

describe('ResolveIQ Backend Business Rules & API Tests', () => {
  let customerToken = '';
  let customerUser = null;
  let managerToken = '';
  let managerUser = null;
  let agentToken = '';
  let agentUser = null;
  let testTicket = null;

  beforeAll(async () => {
    // 1. Authenticate Customer
    const customerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'customer.john@example.com', password: 'Customer@123' });
    customerToken = customerLogin.body.token;
    customerUser = customerLogin.body.user;

    // 2. Authenticate Manager
    const managerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager@resolveiq.com', password: 'Manager@123' });
    managerToken = managerLogin.body.token;
    managerUser = managerLogin.body.user;

    // 3. Authenticate Agent
    const agentLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'agent.sarah@resolveiq.com', password: 'Agent@123' });
    agentToken = agentLogin.body.token;
    agentUser = agentLogin.body.user;

    // Get an existing seeded ticket
    testTicket = await prisma.complaint.findFirst({
      where: { ticketNumber: 'RIQ-2026-00001' }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Priority Engine & Deterministic Rules', () => {
    it('should assign CRITICAL priority for severe outage and immediate urgency', () => {
      const result = calculateSuggestedPriority({
        impact: 'Critical outage',
        urgency: 'Critical immediate',
        affectedUsers: 500,
        categoryName: 'Technical Outage & Service Disruption'
      });
      expect(result.suggestedPriority).toBe(PRIORITIES.CRITICAL);
      expect(result.score).toBeGreaterThanOrEqual(75);
    });

    it('should assign LOW priority for minor cosmetic bug with single user', () => {
      const result = calculateSuggestedPriority({
        impact: 'Low cosmetic',
        urgency: 'Low flexible',
        affectedUsers: 1,
        categoryName: 'Product Features & Functional Bugs'
      });
      expect(result.suggestedPriority).toBe(PRIORITIES.LOW);
      expect(result.score).toBeLessThan(35);
    });
  });

  describe('2. SLA Deadlines & Status Derivation', () => {
    it('should calculate accurate response and resolution deadlines', async () => {
      const now = new Date();
      const deadlines = await calculateDeadlines(PRIORITIES.CRITICAL, now);
      expect(deadlines.responseDeadline.getTime()).toBeGreaterThan(now.getTime());
      expect(deadlines.resolutionDeadline.getTime()).toBeGreaterThan(deadlines.responseDeadline.getTime());
    });

    it('should correctly flag overdue status when past resolution deadline', () => {
      const mockPastComplaint = {
        status: STATUSES.IN_PROGRESS,
        resolutionDeadline: new Date(Date.now() - 3600000), // 1 hour ago
        isOverdue: false
      };
      const sla = getComplaintSLAStatus(mockPastComplaint);
      expect(sla.status).toBe('OVERDUE');
      expect(sla.isBreached).toBe(true);
    });
  });

  describe('3. Role Authorization & Privacy (Insecure Direct Object Reference)', () => {
    it('should prevent Customer from accessing other customers tickets', async () => {
      // Find a complaint that belongs to customer.alice, not customer.john
      const otherComplaint = await prisma.complaint.findFirst({
        where: { customer: { email: 'customer.alice@example.com' } }
      });

      const res = await request(app)
        .get(`/api/v1/complaints/${otherComplaint.id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should strictly hide internal notes from Customer responses', async () => {
      // Ticket 1 has both a public comment and an internal note
      const res = await request(app)
        .get(`/api/v1/complaints/${testTicket.id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      const comments = res.body.data.comments;
      // Must not contain any isInternal = true comments
      const internalComments = comments.filter(c => c.isInternal);
      expect(internalComments.length).toBe(0);
    });

    it('should allow Support Staff to view internal notes', async () => {
      const res = await request(app)
        .get(`/api/v1/complaints/${testTicket.id}`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      const comments = res.body.data.comments;
      const internalComments = comments.filter(c => c.isInternal);
      expect(internalComments.length).toBeGreaterThan(0);
    });

    it('should forbid Customer from creating internal notes', async () => {
      const res = await request(app)
        .post(`/api/v1/complaints/${testTicket.id}/comments`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ message: 'Attempted hack note', isInternal: true });

      expect(res.status).toBe(403);
    });
  });

  describe('4. Status Machine Transitions', () => {
    it('should reject invalid status transitions', async () => {
      // Ticket 1 is IN_PROGRESS. Transitioning directly to CLOSED without resolution is invalid
      const res = await request(app)
        .patch(`/api/v1/complaints/${testTicket.id}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ newStatus: STATUSES.CLOSED });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject reopening without a reason', async () => {
      const resolvedTicket = await prisma.complaint.findFirst({
        where: { status: STATUSES.RESOLVED }
      });

      const res = await request(app)
        .patch(`/api/v1/complaints/${resolvedTicket.id}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ newStatus: STATUSES.REOPENED, reason: '' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('reason is required');
    });
  });

  describe('5. Analytics Dashboard & Metrics', () => {
    it('should calculate valid real metrics without division by zero', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalComplaints).toBeGreaterThanOrEqual(20);
      expect(res.body.data.charts.byCategory.length).toBeGreaterThan(0);
      expect(res.body.data.charts.byPriority.length).toBeGreaterThan(0);
    });
  });
});
