// System Constants and Configuration

export const ROLES = {
  CUSTOMER: 'CUSTOMER',
  AGENT: 'AGENT',
  MANAGER: 'MANAGER'
};

export const PRIORITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

export const STATUSES = {
  OPEN: 'OPEN',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_FOR_CUSTOMER: 'WAITING_FOR_CUSTOMER',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
  REOPENED: 'REOPENED'
};

// Permitted status transitions map
// Key: Current Status, Value: Array of allowable next statuses
export const VALID_TRANSITIONS = {
  OPEN: ['ASSIGNED', 'IN_PROGRESS', 'CLOSED'],
  ASSIGNED: ['IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'OPEN'],
  IN_PROGRESS: ['WAITING_FOR_CUSTOMER', 'RESOLVED', 'ASSIGNED'],
  WAITING_FOR_CUSTOMER: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'], // Allowed only with manager/agent approval and explicit reason
  REOPENED: ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED']
};

// Default SLA Policies (hours)
export const DEFAULT_SLA_POLICIES = {
  CRITICAL: { firstResponseHours: 0.25, resolutionHours: 4 }, // 15 mins response, 4h resolution
  HIGH: { firstResponseHours: 1.0, resolutionHours: 12 },    // 1h response, 12h resolution
  MEDIUM: { firstResponseHours: 4.0, resolutionHours: 48 },  // 4h response, 48h resolution
  LOW: { firstResponseHours: 8.0, resolutionHours: 72 }      // 8h response, 72h resolution
};

// Standard Categories
export const DEFAULT_CATEGORIES = [
  {
    name: 'Technical Outage & Service Disruption',
    description: 'System crashes, server downtimes, critical API failures, or widespread outages.',
    defaultPriority: 'CRITICAL'
  },
  {
    name: 'Billing, Invoicing & Payments',
    description: 'Incorrect charges, payment gateway failures, refund requests, or subscription disputes.',
    defaultPriority: 'HIGH'
  },
  {
    name: 'Account Access & Authentication',
    description: '2FA issues, locked accounts, credential resets, or single sign-on problems.',
    defaultPriority: 'HIGH'
  },
  {
    name: 'Product Features & Functional Bugs',
    description: 'UI glitches, feature malfunctions, workflow errors, or unexpected validation failures.',
    defaultPriority: 'MEDIUM'
  },
  {
    name: 'Service Quality & Customer Experience',
    description: 'Delays in response, onboarding guidance, communication issues, or account management.',
    defaultPriority: 'MEDIUM'
  },
  {
    name: 'Security & Data Privacy',
    description: 'Suspicious account activity, data compliance concerns, or permission leakage.',
    defaultPriority: 'CRITICAL'
  }
];
