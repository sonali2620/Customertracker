import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_CATEGORIES, DEFAULT_SLA_POLICIES, ROLES, STATUSES, PRIORITIES } from '../src/config/constants.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting ResolveIQ database seeding...');

  // 1. Seed SLA Policies
  console.log('Configuring SLA Policies...');
  for (const [priority, policy] of Object.entries(DEFAULT_SLA_POLICIES)) {
    await prisma.sLAPolicy.upsert({
      where: { priority },
      update: {
        firstResponseHours: policy.firstResponseHours,
        resolutionHours: policy.resolutionHours
      },
      create: {
        priority,
        firstResponseHours: policy.firstResponseHours,
        resolutionHours: policy.resolutionHours,
        description: `Standard SLA: ${policy.firstResponseHours}h response, ${policy.resolutionHours}h resolution`
      }
    });
  }

  // 2. Seed Complaint Categories
  console.log('Creating Complaint Categories...');
  const categoryMap = {};
  for (const cat of DEFAULT_CATEGORIES) {
    const createdCat = await prisma.complaintCategory.upsert({
      where: { name: cat.name },
      update: {
        description: cat.description,
        defaultPriority: cat.defaultPriority
      },
      create: {
        name: cat.name,
        description: cat.description,
        defaultPriority: cat.defaultPriority
      }
    });
    categoryMap[cat.name] = createdCat.id;
  }

  // 3. Seed Users (Manager, Agents, Customers)
  console.log('Creating Demo Users...');
  const managerPassword = await bcrypt.hash('Manager@123', 10);
  const agentPassword = await bcrypt.hash('Agent@123', 10);
  const customerPassword = await bcrypt.hash('Customer@123', 10);

  // Manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@resolveiq.com' },
    update: {},
    create: {
      name: 'Alexander Sterling',
      email: 'manager@resolveiq.com',
      password: managerPassword,
      role: ROLES.MANAGER,
      department: 'Customer Operations & Quality',
      phone: '+1-555-0100',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      maxWorkload: 0
    }
  });

  // Support Agents
  const agent1 = await prisma.user.upsert({
    where: { email: 'agent.sarah@resolveiq.com' },
    update: {},
    create: {
      name: 'Sarah Jenkins',
      email: 'agent.sarah@resolveiq.com',
      password: agentPassword,
      role: ROLES.AGENT,
      department: 'Technical & Platform Tier 2',
      phone: '+1-555-0101',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      maxWorkload: 10,
      skills: ['Technical Outage & Service Disruption', 'Product Features & Functional Bugs', 'Account Access & Authentication']
    }
  });

  const agent2 = await prisma.user.upsert({
    where: { email: 'agent.david@resolveiq.com' },
    update: {},
    create: {
      name: 'David Chen',
      email: 'agent.david@resolveiq.com',
      password: agentPassword,
      role: ROLES.AGENT,
      department: 'Financial & Billing Support',
      phone: '+1-555-0102',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      maxWorkload: 8,
      skills: ['Billing, Invoicing & Payments', 'Service Quality & Customer Experience']
    }
  });

  const agent3 = await prisma.user.upsert({
    where: { email: 'agent.elena@resolveiq.com' },
    update: {},
    create: {
      name: 'Elena Rostova',
      email: 'agent.elena@resolveiq.com',
      password: agentPassword,
      role: ROLES.AGENT,
      department: 'Security & Enterprise Accounts',
      phone: '+1-555-0103',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      maxWorkload: 12,
      skills: ['Security & Data Privacy', 'Technical Outage & Service Disruption', 'Account Access & Authentication']
    }
  });

  // Customers
  const customer1 = await prisma.user.upsert({
    where: { email: 'customer.john@example.com' },
    update: {},
    create: {
      name: 'John Miller',
      email: 'customer.john@example.com',
      password: customerPassword,
      role: ROLES.CUSTOMER,
      department: 'Nexus Retail Inc.',
      phone: '+1-555-0201'
    }
  });

  const customer2 = await prisma.user.upsert({
    where: { email: 'customer.alice@example.com' },
    update: {},
    create: {
      name: 'Alice Henderson',
      email: 'customer.alice@example.com',
      password: customerPassword,
      role: ROLES.CUSTOMER,
      department: 'Apex Health Systems',
      phone: '+1-555-0202'
    }
  });

  const customer3 = await prisma.user.upsert({
    where: { email: 'customer.bob@example.com' },
    update: {},
    create: {
      name: 'Robert Vance',
      email: 'customer.bob@example.com',
      password: customerPassword,
      role: ROLES.CUSTOMER,
      department: 'Vance Refrigeration Corp.',
      phone: '+1-555-0203'
    }
  });

  const customer4 = await prisma.user.upsert({
    where: { email: 'customer.emma@example.com' },
    update: {},
    create: {
      name: 'Emma Watson-Clarke',
      email: 'customer.emma@example.com',
      password: customerPassword,
      role: ROLES.CUSTOMER,
      department: 'Horizon Global Logistics',
      phone: '+1-555-0204'
    }
  });

  // 4. Seed Realistic Complaints (22 Distinct Records)
  console.log('Seeding 22 Complaints across categories, priorities and statuses...');

  const now = new Date();
  const getPastDate = (hoursAgo) => new Date(now.getTime() - hoursAgo * 3600 * 1000);
  const getFutureDate = (hoursAhead) => new Date(now.getTime() + hoursAhead * 3600 * 1000);

  const complaintsData = [
    // 1. Critical Overdue Complaint
    {
      ticketNumber: 'RIQ-2026-00001',
      title: 'Production API Gateway 502 Bad Gateway Outage',
      description: 'Our core checkout API endpoint has been failing with 502 Bad Gateway responses for the past 6 hours, impacting all customer orders in the US-East region.',
      customerId: customer1.id,
      categoryName: 'Technical Outage & Service Disruption',
      priority: PRIORITIES.CRITICAL,
      status: STATUSES.IN_PROGRESS,
      assignedAgentId: agent1.id,
      impact: 'Critical',
      urgency: 'Critical',
      affectedUsers: 1450,
      createdAt: getPastDate(7),
      responseDeadline: getPastDate(6.75),
      resolutionDeadline: getPastDate(3), // overdue by 3h
      firstResponseAt: getPastDate(6.8),
      isOverdue: true,
      isEscalated: true,
      escalatedAt: getPastDate(2.5)
    },
    // 2. High Priority At-Risk Complaint
    {
      ticketNumber: 'RIQ-2026-00002',
      title: 'Double Billing on Enterprise Annual Subscription Renewal',
      description: 'Our corporate card was charged twice on October 18 for invoice #INV-8892 ($24,000 total instead of $12,000). Need urgent reversal and credit note.',
      customerId: customer2.id,
      categoryName: 'Billing, Invoicing & Payments',
      priority: PRIORITIES.HIGH,
      status: STATUSES.IN_PROGRESS,
      assignedAgentId: agent2.id,
      impact: 'High',
      urgency: 'High',
      affectedUsers: 1,
      createdAt: getPastDate(10),
      responseDeadline: getPastDate(9),
      resolutionDeadline: getFutureDate(2), // 2 hours remaining -> At Risk
      firstResponseAt: getPastDate(9.2),
      isOverdue: false,
      isEscalated: false
    },
    // 3. Reopened Ticket with History & Feedback
    {
      ticketNumber: 'RIQ-2026-00003',
      title: 'SSO SAML Identity Provider Certificate Expired',
      description: 'Employees cannot log in via Okta Single Sign-On. Error code SAML_CERT_MISMATCH.',
      customerId: customer3.id,
      categoryName: 'Account Access & Authentication',
      priority: PRIORITIES.HIGH,
      status: STATUSES.REOPENED,
      assignedAgentId: agent3.id,
      impact: 'High',
      urgency: 'High',
      affectedUsers: 85,
      createdAt: getPastDate(48),
      responseDeadline: getPastDate(47),
      resolutionDeadline: getFutureDate(8),
      firstResponseAt: getPastDate(47.5),
      resolvedAt: null,
      reopenedCount: 1,
      lastReopenedAt: getPastDate(3),
      reopenReason: 'SSO worked briefly yesterday but cert threw another validation failure this morning on subdomain eu.ourdomain.com.',
      isOverdue: false
    },
    // 4. Resolved Ticket with 5-Star Feedback
    {
      ticketNumber: 'RIQ-2026-00004',
      title: 'Webhook payload signature verification failing',
      description: 'HMAC SHA256 header computation returned mismatch on our receiver endpoint.',
      customerId: customer4.id,
      categoryName: 'Product Features & Functional Bugs',
      priority: PRIORITIES.MEDIUM,
      status: STATUSES.RESOLVED,
      assignedAgentId: agent1.id,
      impact: 'Moderate',
      urgency: 'Normal',
      affectedUsers: 5,
      createdAt: getPastDate(24),
      responseDeadline: getPastDate(20),
      resolutionDeadline: getFutureDate(24),
      firstResponseAt: getPastDate(22),
      resolvedAt: getPastDate(4),
      resolutionNotes: 'Updated documentation with correct hex encoding format for secret salt. Customer confirmed successful webhook verification.'
    },
    // 5. Closed Ticket with 4-Star Feedback
    {
      ticketNumber: 'RIQ-2026-00005',
      title: 'Incorrect Sales Tax Rate applied on Illinois shipments',
      description: 'Tax rate charged was 9.25% instead of state standard 6.25% on invoice #TX-4401.',
      customerId: customer1.id,
      categoryName: 'Billing, Invoicing & Payments',
      priority: PRIORITIES.MEDIUM,
      status: STATUSES.CLOSED,
      assignedAgentId: agent2.id,
      impact: 'Moderate',
      urgency: 'Normal',
      affectedUsers: 12,
      createdAt: getPastDate(72),
      responseDeadline: getPastDate(68),
      resolutionDeadline: getPastDate(24),
      firstResponseAt: getPastDate(70),
      resolvedAt: getPastDate(30),
      closedAt: getPastDate(12),
      resolutionNotes: 'Corrected Illinois jurisdiction tax matrix and credited excess amount of $342.10.'
    },
    // 6. Open Unassigned Complaint (Demonstrates Unassigned Queue & Auto-Assignment)
    {
      ticketNumber: 'RIQ-2026-00006',
      title: 'Data Export to CSV hangs indefinitely on tables > 10,000 rows',
      description: 'When clicking Export All Reports on the customer records page, spinner loops forever and server terminates connection.',
      customerId: customer2.id,
      categoryName: 'Product Features & Functional Bugs',
      priority: PRIORITIES.MEDIUM,
      status: STATUSES.OPEN,
      assignedAgentId: null,
      impact: 'Moderate',
      urgency: 'Normal',
      affectedUsers: 40,
      createdAt: getPastDate(2),
      responseDeadline: getFutureDate(2),
      resolutionDeadline: getFutureDate(46)
    },
    // 7. Critical Outage Ticket Resolved Post-SLA (Demonstrates Breached SLA Metric)
    {
      ticketNumber: 'RIQ-2026-00007',
      title: 'Database connection pool exhaustion during flash sale',
      description: 'Postgres active connections hit max 200 during morning marketing campaign.',
      customerId: customer3.id,
      categoryName: 'Technical Outage & Service Disruption',
      priority: PRIORITIES.CRITICAL,
      status: STATUSES.RESOLVED,
      assignedAgentId: agent1.id,
      impact: 'Critical',
      urgency: 'Critical',
      affectedUsers: 500,
      createdAt: getPastDate(20),
      responseDeadline: getPastDate(19.75),
      resolutionDeadline: getPastDate(16),
      firstResponseAt: getPastDate(19.5),
      resolvedAt: getPastDate(12), // Resolved 4h after deadline
      resolutionNotes: 'Increased pool limits with PgBouncer connection multiplexer and tuned slow query.',
      isOverdue: true,
      isEscalated: true
    },
    // 8. Waiting for Customer Feedback
    {
      ticketNumber: 'RIQ-2026-00008',
      title: 'Mobile App crashes on biometric Face ID prompt',
      description: 'On iOS 18 devices, app crashes immediately upon activating FaceID login.',
      customerId: customer4.id,
      categoryName: 'Product Features & Functional Bugs',
      priority: PRIORITIES.HIGH,
      status: STATUSES.WAITING_FOR_CUSTOMER,
      assignedAgentId: agent1.id,
      impact: 'High',
      urgency: 'High',
      affectedUsers: 25,
      createdAt: getPastDate(15),
      responseDeadline: getPastDate(14),
      resolutionDeadline: getFutureDate(5),
      firstResponseAt: getPastDate(14.5)
    },
    // 9. Low Priority Service Inquiry
    {
      ticketNumber: 'RIQ-2026-00009',
      title: 'Request for custom onboarding training recording',
      description: 'Would like a link to download the customer success training video from last week.',
      customerId: customer1.id,
      categoryName: 'Service Quality & Customer Experience',
      priority: PRIORITIES.LOW,
      status: STATUSES.ASSIGNED,
      assignedAgentId: agent2.id,
      impact: 'Low',
      urgency: 'Low',
      affectedUsers: 1,
      createdAt: getPastDate(12),
      responseDeadline: getPastDate(4),
      resolutionDeadline: getFutureDate(60),
      firstResponseAt: getPastDate(5)
    },
    // 10. Security Compliance Ticket
    {
      ticketNumber: 'RIQ-2026-00010',
      title: 'SOC-2 Type II Audit Compliance Report Request',
      description: 'Our compliance officer requires the latest annual SOC2 report and third-party penetration testing summary.',
      customerId: customer2.id,
      categoryName: 'Security & Data Privacy',
      priority: PRIORITIES.HIGH,
      status: STATUSES.IN_PROGRESS,
      assignedAgentId: agent3.id,
      impact: 'High',
      urgency: 'Normal',
      affectedUsers: 1,
      createdAt: getPastDate(8),
      responseDeadline: getPastDate(7),
      resolutionDeadline: getFutureDate(4),
      firstResponseAt: getPastDate(7.5)
    },
    // 11. Billing Dispute
    {
      ticketNumber: 'RIQ-2026-00011',
      title: 'Unrecognized transaction code #V982 on bank statement',
      description: 'Appears as REZ-IQ-CORP for $180.00. We do not have record of this monthly addon.',
      customerId: customer3.id,
      categoryName: 'Billing, Invoicing & Payments',
      priority: PRIORITIES.MEDIUM,
      status: STATUSES.OPEN,
      assignedAgentId: null,
      impact: 'Moderate',
      urgency: 'Normal',
      affectedUsers: 1,
      createdAt: getPastDate(5),
      responseDeadline: getPastDate(1),
      resolutionDeadline: getFutureDate(43)
    },
    // 12. Account Locked
    {
      ticketNumber: 'RIQ-2026-00012',
      title: 'Finance director account locked after password reset',
      description: 'The automated reset token email is not reaching director@nexusretail.com domain.',
      customerId: customer1.id,
      categoryName: 'Account Access & Authentication',
      priority: PRIORITIES.HIGH,
      status: STATUSES.ASSIGNED,
      assignedAgentId: agent3.id,
      impact: 'High',
      urgency: 'High',
      affectedUsers: 1,
      createdAt: getPastDate(3),
      responseDeadline: getPastDate(2),
      resolutionDeadline: getFutureDate(9),
      firstResponseAt: getPastDate(2.5)
    },
    // 13. High Priority Outage Resolved
    {
      ticketNumber: 'RIQ-2026-00013',
      title: 'Search Index ElasticSearch cluster memory spike',
      description: 'Search queries taking over 15 seconds to return autocomplete results.',
      customerId: customer4.id,
      categoryName: 'Technical Outage & Service Disruption',
      priority: PRIORITIES.HIGH,
      status: STATUSES.RESOLVED,
      assignedAgentId: agent1.id,
      impact: 'High',
      urgency: 'High',
      affectedUsers: 250,
      createdAt: getPastDate(35),
      responseDeadline: getPastDate(34),
      resolutionDeadline: getPastDate(23),
      firstResponseAt: getPastDate(34.2),
      resolvedAt: getPastDate(26), // Within SLA
      resolutionNotes: 'Purged cold heap indices and scaled Elastic node replica count from 2 to 4.'
    },
    // 14. Support Response Delay Complaint
    {
      ticketNumber: 'RIQ-2026-00014',
      title: 'Response SLA delayed on ticket RIQ-2026-00002',
      description: 'Customer escalating delay in invoice adjustment response.',
      customerId: customer2.id,
      categoryName: 'Service Quality & Customer Experience',
      priority: PRIORITIES.MEDIUM,
      status: STATUSES.ASSIGNED,
      assignedAgentId: agent2.id,
      impact: 'Moderate',
      urgency: 'Normal',
      affectedUsers: 1,
      createdAt: getPastDate(6),
      responseDeadline: getPastDate(2),
      resolutionDeadline: getFutureDate(42),
      firstResponseAt: getPastDate(3)
    },
    // 15. UI Bug in Dark Mode
    {
      ticketNumber: 'RIQ-2026-00015',
      title: 'Text contrast in dark mode dashboard charts unreadable',
      description: 'Metric labels blend into background when high contrast mode is off.',
      customerId: customer3.id,
      categoryName: 'Product Features & Functional Bugs',
      priority: PRIORITIES.LOW,
      status: STATUSES.RESOLVED,
      assignedAgentId: agent1.id,
      impact: 'Low',
      urgency: 'Low',
      affectedUsers: 5,
      createdAt: getPastDate(50),
      responseDeadline: getPastDate(42),
      resolutionDeadline: getPastDate(2),
      firstResponseAt: getPastDate(45),
      resolvedAt: getPastDate(15),
      resolutionNotes: 'Updated CSS custom properties with improved WCAG AAA compliant contrast.'
    },
    // 16. Security Phishing Alert
    {
      ticketNumber: 'RIQ-2026-00016',
      title: 'Phishing email impersonating ResolveIQ invoice notification',
      description: 'Multiple staff members received email from resolveiq-billing.net with suspicious attachment.',
      customerId: customer4.id,
      categoryName: 'Security & Data Privacy',
      priority: PRIORITIES.CRITICAL,
      status: STATUSES.IN_PROGRESS,
      assignedAgentId: agent3.id,
      impact: 'Critical',
      urgency: 'Critical',
      affectedUsers: 180,
      createdAt: getPastDate(1.5),
      responseDeadline: getPastDate(1.25),
      resolutionDeadline: getFutureDate(2.5),
      firstResponseAt: getPastDate(1.3),
      isOverdue: false
    },
    // 17. Reopened Ticket: Payment Gateway Gateway Timeout
    {
      ticketNumber: 'RIQ-2026-00017',
      title: 'Stripe webhook 3D Secure verification dropping sessions',
      description: 'Customers from European cards are failing 3DS authentication flow.',
      customerId: customer1.id,
      categoryName: 'Billing, Invoicing & Payments',
      priority: PRIORITIES.HIGH,
      status: STATUSES.REOPENED,
      assignedAgentId: agent2.id,
      impact: 'High',
      urgency: 'High',
      affectedUsers: 30,
      createdAt: getPastDate(30),
      responseDeadline: getPastDate(29),
      resolutionDeadline: getFutureDate(6),
      firstResponseAt: getPastDate(29.2),
      reopenedCount: 1,
      lastReopenedAt: getPastDate(4),
      reopenReason: 'Reopened: Still occurring on Barclays and BNP Paribas issued cards.'
    },
    // 18. Low Priority Inquiry
    {
      ticketNumber: 'RIQ-2026-00018',
      title: 'Feature Request: Add multi-currency support in invoice view',
      description: 'Would love to see GBP and EUR converted totals directly in the summary table.',
      customerId: customer2.id,
      categoryName: 'Product Features & Functional Bugs',
      priority: PRIORITIES.LOW,
      status: STATUSES.OPEN,
      assignedAgentId: null,
      impact: 'Low',
      urgency: 'Low',
      affectedUsers: 1,
      createdAt: getPastDate(18),
      responseDeadline: getPastDate(10),
      resolutionDeadline: getFutureDate(54)
    },
    // 19. Closed Ticket
    {
      ticketNumber: 'RIQ-2026-00019',
      title: 'API Rate limit too restrictive on batch user import',
      description: 'Hit 60 req/min limit while syncing 500 employee records during onboarding.',
      customerId: customer3.id,
      categoryName: 'Technical Outage & Service Disruption',
      priority: PRIORITIES.MEDIUM,
      status: STATUSES.CLOSED,
      assignedAgentId: agent1.id,
      impact: 'Moderate',
      urgency: 'Normal',
      affectedUsers: 500,
      createdAt: getPastDate(100),
      responseDeadline: getPastDate(96),
      resolutionDeadline: getPastDate(52),
      firstResponseAt: getPastDate(97),
      resolvedAt: getPastDate(60),
      closedAt: getPastDate(40),
      resolutionNotes: 'Temporarily lifted rate limit to 300 req/min and provided bulk import JSON endpoint.'
    },
    // 20. Overdue Ticket: Data Retention Policy Inquiry
    {
      ticketNumber: 'RIQ-2026-00020',
      title: 'GDPR Right to Be Forgotten Data Deletion Request',
      description: 'Formal user data purge request for resigned contractor profile ID #8812.',
      customerId: customer4.id,
      categoryName: 'Security & Data Privacy',
      priority: PRIORITIES.HIGH,
      status: STATUSES.IN_PROGRESS,
      assignedAgentId: agent3.id,
      impact: 'High',
      urgency: 'High',
      affectedUsers: 1,
      createdAt: getPastDate(25),
      responseDeadline: getPastDate(24),
      resolutionDeadline: getPastDate(13), // overdue by 13h
      firstResponseAt: getPastDate(24.5),
      isOverdue: true,
      isEscalated: true,
      escalatedAt: getPastDate(12)
    },
    // 21. Fresh Open Ticket
    {
      ticketNumber: 'RIQ-2026-00021',
      title: 'Email notifications delayed by 45 minutes',
      description: 'Transactional emails for order approvals are queuing up in Mailgun backend.',
      customerId: customer1.id,
      categoryName: 'Service Quality & Customer Experience',
      priority: PRIORITIES.MEDIUM,
      status: STATUSES.ASSIGNED,
      assignedAgentId: agent2.id,
      impact: 'Moderate',
      urgency: 'Normal',
      affectedUsers: 60,
      createdAt: getPastDate(1),
      responseDeadline: getFutureDate(3),
      resolutionDeadline: getFutureDate(47)
    },
    // 22. Resolved Ticket with Feedback
    {
      ticketNumber: 'RIQ-2026-00022',
      title: 'Customer Portal navigation link broken on mobile devices',
      description: 'Hamburger menu dropdown fails to expand on Safari mobile.',
      customerId: customer2.id,
      categoryName: 'Product Features & Functional Bugs',
      priority: PRIORITIES.LOW,
      status: STATUSES.RESOLVED,
      assignedAgentId: agent1.id,
      impact: 'Low',
      urgency: 'Normal',
      affectedUsers: 15,
      createdAt: getPastDate(28),
      responseDeadline: getPastDate(20),
      resolutionDeadline: getFutureDate(44),
      firstResponseAt: getPastDate(22),
      resolvedAt: getPastDate(6),
      resolutionNotes: 'Fixed z-index stacking context on mobile navigation backdrop overlay.'
    }
  ];

  for (const item of complaintsData) {
    const categoryId = categoryMap[item.categoryName];
    const complaint = await prisma.complaint.upsert({
      where: { ticketNumber: item.ticketNumber },
      update: {},
      create: {
        ticketNumber: item.ticketNumber,
        title: item.title,
        description: item.description,
        customerId: item.customerId,
        categoryId,
        priority: item.priority,
        suggestedPriority: item.priority,
        priorityReason: `Deterministic engine evaluation: ${item.impact} impact and ${item.urgency} urgency.`,
        status: item.status,
        assignedAgentId: item.assignedAgentId,
        impact: item.impact,
        urgency: item.urgency,
        affectedUsers: item.affectedUsers,
        createdAt: item.createdAt,
        responseDeadline: item.responseDeadline,
        resolutionDeadline: item.resolutionDeadline,
        firstResponseAt: item.firstResponseAt || null,
        resolvedAt: item.resolvedAt || null,
        closedAt: item.closedAt || null,
        reopenReason: item.reopenReason || null,
        reopenedCount: item.reopenedCount || 0,
        lastReopenedAt: item.lastReopenedAt || null,
        resolutionNotes: item.resolutionNotes || null,
        isOverdue: item.isOverdue || false,
        isEscalated: item.isEscalated || false,
        escalatedAt: item.escalatedAt || null
      }
    });

    // Create Initial Status History
    await prisma.statusHistory.create({
      data: {
        complaintId: complaint.id,
        previousStatus: STATUSES.OPEN,
        newStatus: item.status,
        changedById: item.customerId,
        reason: 'Initial ticket registration',
        createdAt: item.createdAt
      }
    });

    // Create Assignment History if assigned
    if (item.assignedAgentId) {
      await prisma.assignmentHistory.create({
        data: {
          complaintId: complaint.id,
          previousAgentId: null,
          newAgentId: item.assignedAgentId,
          assignedById: manager.id,
          reason: 'Auto-assigned by workload and skill routing',
          createdAt: new Date(item.createdAt.getTime() + 10 * 60 * 1000)
        }
      });
    }

    // Create Escalation History if escalated
    if (item.isEscalated) {
      await prisma.escalationHistory.create({
        data: {
          complaintId: complaint.id,
          level: 1,
          reason: `Resolution SLA Breached: Ticket ${item.ticketNumber} exceeded resolution target.`,
          notifiedUserId: manager.id,
          createdAt: item.escalatedAt || now
        }
      });
    }
  }

  // 5. Seed Public Comments and Internal Notes
  console.log('Adding Comments, Internal Notes, and Audit Logs...');
  const ticket1 = await prisma.complaint.findUnique({ where: { ticketNumber: 'RIQ-2026-00001' } });
  if (ticket1) {
    // Public staff response
    await prisma.complaintComment.create({
      data: {
        complaintId: ticket1.id,
        userId: agent1.id,
        message: 'Hello John, our cloud infrastructure team has confirmed an upstream edge gateway failure and is routing traffic to the backup Virginia cluster.',
        isInternal: false,
        createdAt: getPastDate(6)
      }
    });

    // Private internal note (HIDDEN from customers!)
    await prisma.complaintComment.create({
      data: {
        complaintId: ticket1.id,
        userId: agent1.id,
        message: '[INTERNAL NOTE] Gateway container memory limit exceeded. Investigating leak in auth middleware before full restart.',
        isInternal: true,
        createdAt: getPastDate(5.5)
      }
    });

    // Customer reply
    await prisma.complaintComment.create({
      data: {
        complaintId: ticket1.id,
        userId: customer1.id,
        message: 'Understood, we are monitoring checkout completion on our end. Please keep us updated.',
        isInternal: false,
        createdAt: getPastDate(5)
      }
    });
  }

  // 6. Seed Customer Feedback Ratings (1-5 stars)
  console.log('Seeding CSAT Ratings...');
  const ticket4 = await prisma.complaint.findUnique({ where: { ticketNumber: 'RIQ-2026-00004' } });
  if (ticket4) {
    await prisma.feedback.upsert({
      where: { complaintId: ticket4.id },
      update: {},
      create: {
        complaintId: ticket4.id,
        customerId: customer4.id,
        rating: 5,
        comment: 'Fantastic response time! Sarah provided the exact solution to fix our HMAC webhook calculation.',
        createdAt: getPastDate(3)
      }
    });
  }

  const ticket5 = await prisma.complaint.findUnique({ where: { ticketNumber: 'RIQ-2026-00005' } });
  if (ticket5) {
    await prisma.feedback.upsert({
      where: { complaintId: ticket5.id },
      update: {},
      create: {
        complaintId: ticket5.id,
        customerId: customer1.id,
        rating: 4,
        comment: 'Resolution took a couple of days but the refund credit was processed accurately. Thank you David.',
        createdAt: getPastDate(10)
      }
    });
  }

  const ticket22 = await prisma.complaint.findUnique({ where: { ticketNumber: 'RIQ-2026-00022' } });
  if (ticket22) {
    await prisma.feedback.upsert({
      where: { complaintId: ticket22.id },
      update: {},
      create: {
        complaintId: ticket22.id,
        customerId: customer2.id,
        rating: 5,
        comment: 'Fixed in less than 24 hours. The mobile menu works seamlessly now.',
        createdAt: getPastDate(5)
      }
    });
  }

  // 7. Seed Notifications
  console.log('Seeding In-App Notifications...');
  await prisma.notification.createMany({
    data: [
      {
        userId: manager.id,
        title: 'Escalation Alert: RIQ-2026-00001 Overdue',
        message: 'Production API Gateway Outage has exceeded its 4-hour resolution SLA target.',
        type: 'ESCALATION',
        complaintId: ticket1 ? ticket1.id : null,
        isRead: false,
        createdAt: getPastDate(2)
      },
      {
        userId: agent1.id,
        title: 'Ticket Assigned: RIQ-2026-00001',
        message: 'Critical priority complaint has been assigned to you.',
        type: 'ASSIGNMENT',
        complaintId: ticket1 ? ticket1.id : null,
        isRead: true,
        createdAt: getPastDate(6.9)
      },
      {
        userId: customer1.id,
        title: 'Update on Ticket RIQ-2026-00001',
        message: 'Sarah Jenkins posted a new reply regarding your API gateway issue.',
        type: 'COMMENT',
        complaintId: ticket1 ? ticket1.id : null,
        isRead: false,
        createdAt: getPastDate(6)
      }
    ]
  });

  console.log('✅ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
