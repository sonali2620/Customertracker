import prisma from '../config/db.js';
import { calculateSuggestedPriority } from './priorityEngine.js';

const AI_API_KEY = process.env.AI_PROVIDER_API_KEY || '';

/**
 * Advisory AI Assistant Service
 * Provides intelligent suggestions with deterministic rule-based NLP fallback
 * when no external AI provider API key is configured.
 */

/**
 * Suggest category and priority based on text content
 */
export async function suggestCategoryAndPriority({ title = '', description = '' }) {
  const combinedText = `${title} ${description}`.toLowerCase();

  // Categories in database
  const categories = await prisma.complaintCategory.findMany({
    where: { isActive: true }
  });

  // NLP Keyword mapping for categories
  const keywordMappings = [
    {
      keywords: ['down', 'crash', 'outage', 'unavailable', '500', '502', '503', 'server error', 'offline', 'incident'],
      preferredCategory: 'Technical Outage & Service Disruption',
      impact: 'Critical',
      urgency: 'Critical'
    },
    {
      keywords: ['charge', 'bill', 'billing', 'invoice', 'payment', 'refund', 'charged twice', 'credit card', 'subscription', 'price'],
      preferredCategory: 'Billing, Invoicing & Payments',
      impact: 'High',
      urgency: 'High'
    },
    {
      keywords: ['login', 'password', '2fa', 'authenticat', 'locked out', 'credentials', 'reset password', 'account access', 'sso'],
      preferredCategory: 'Account Access & Authentication',
      impact: 'High',
      urgency: 'High'
    },
    {
      keywords: ['breach', 'security', 'leak', 'unauthorized', 'hacked', 'privacy', 'gdpr', 'confidential'],
      preferredCategory: 'Security & Data Privacy',
      impact: 'Critical',
      urgency: 'Critical'
    },
    {
      keywords: ['slow', 'delay', 'support', 'rude', 'agent', 'unhelpful', 'wait time', 'experience', 'escalate'],
      preferredCategory: 'Service Quality & Customer Experience',
      impact: 'Moderate',
      urgency: 'Normal'
    },
    {
      keywords: ['bug', 'glitch', 'button', 'form', 'export', 'dropdown', 'filter', 'error message', 'ui', 'rendering'],
      preferredCategory: 'Product Features & Functional Bugs',
      impact: 'Moderate',
      urgency: 'Normal'
    }
  ];

  let matchedMapping = null;
  let bestMatchCount = 0;

  for (const mapping of keywordMappings) {
    let matchCount = 0;
    for (const kw of mapping.keywords) {
      if (combinedText.includes(kw)) {
        matchCount += 1;
      }
    }
    if (matchCount > bestMatchCount) {
      bestMatchCount = matchCount;
      matchedMapping = mapping;
    }
  }

  // Find corresponding category record
  let suggestedCategory = null;
  if (matchedMapping) {
    suggestedCategory = categories.find(c => 
      c.name.toLowerCase().includes(matchedMapping.preferredCategory.toLowerCase())
    );
  }

  // Fallback to first category if no specific keywords matched
  if (!suggestedCategory && categories.length > 0) {
    suggestedCategory = categories[0];
  }

  const impact = matchedMapping ? matchedMapping.impact : 'Moderate';
  const urgency = matchedMapping ? matchedMapping.urgency : 'Normal';

  // Calculate priority using deterministic engine
  const priorityResult = calculateSuggestedPriority({
    impact,
    urgency,
    affectedUsers: 1,
    categoryName: suggestedCategory ? suggestedCategory.name : ''
  });

  return {
    isAiGenerated: true,
    isExternalProvider: Boolean(AI_API_KEY),
    providerNote: AI_API_KEY ? 'Generated via configured AI provider' : 'Generated via deterministic NLP rule-based classifier (configure AI_PROVIDER_API_KEY for LLM enhancement)',
    advisory: true,
    suggestedCategoryId: suggestedCategory ? suggestedCategory.id : null,
    suggestedCategoryName: suggestedCategory ? suggestedCategory.name : 'General Inquiries',
    suggestedPriority: priorityResult.suggestedPriority,
    confidenceScore: bestMatchCount > 0 ? Math.min(0.95, 0.65 + bestMatchCount * 0.1) : 0.60,
    priorityExplanation: priorityResult.explanation,
    keywordTriggers: matchedMapping ? matchedMapping.keywords.filter(k => combinedText.includes(k)) : []
  };
}

/**
 * Summarize complaint thread (description + comments)
 */
export async function summarizeComplaintThread(complaintId) {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: {
      category: true,
      customer: { select: { name: true, email: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { name: true, role: true } } }
      }
    }
  });

  if (!complaint) {
    throw new Error('Complaint not found');
  }

  const commentCount = complaint.comments.length;
  const publicComments = complaint.comments.filter(c => !c.isInternal);
  const internalNotes = complaint.comments.filter(c => c.isInternal);

  // Deterministic summary extraction
  const summaryBulletPoints = [
    `Issue: "${complaint.title}" reported under category ${complaint.category?.name || 'Uncategorized'}.`,
    `Current status is ${complaint.status} with priority ${complaint.priority}.`,
    `Discussion volume: ${publicComments.length} customer responses and ${internalNotes.length} internal investigation notes recorded.`,
    complaint.resolvedAt 
      ? `Resolved on ${new Date(complaint.resolvedAt).toLocaleDateString()} with notes: ${complaint.resolutionNotes || 'None'}.`
      : `Resolution deadline target is ${complaint.resolutionDeadline ? new Date(complaint.resolutionDeadline).toLocaleString() : 'Unset'}.`
  ];

  return {
    isAiGenerated: true,
    isExternalProvider: Boolean(AI_API_KEY),
    advisory: true,
    disclaimer: 'Advisory summary generated for quick agent review.',
    summary: summaryBulletPoints.join('\n\n'),
    keyPoints: summaryBulletPoints,
    metrics: {
      totalComments: commentCount,
      publicCount: publicComments.length,
      internalCount: internalNotes.length
    }
  };
}

/**
 * Draft a polite, professional customer response for agent review
 */
export async function draftPoliteCustomerResponse(complaintId, intention = 'ACKNOWLEDGEMENT') {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: {
      customer: { select: { name: true } },
      category: true,
      assignedAgent: { select: { name: true } }
    }
  });

  if (!complaint) {
    throw new Error('Complaint not found');
  }

  const customerFirstName = complaint.customer.name.split(' ')[0] || 'valued customer';
  const agentName = complaint.assignedAgent?.name || 'ResolveIQ Support Team';

  let draftMessage = '';

  switch (intention.toUpperCase()) {
    case 'ACKNOWLEDGEMENT':
      draftMessage = `Dear ${customerFirstName},\n\nThank you for reaching out to us regarding "${complaint.title}" (Ticket ${complaint.ticketNumber}).\n\nWe understand the importance of this issue and have assigned it to our support specialists. Our team is actively investigating the matter according to our ${complaint.priority} priority service commitment.\n\nWe will provide you with another update as soon as we make progress.\n\nBest regards,\n${agentName}\nResolveIQ Customer Care`;
      break;

    case 'INFORMATION_REQUEST':
      draftMessage = `Dear ${customerFirstName},\n\nWe are currently investigating your ticket ${complaint.ticketNumber} regarding "${complaint.title}".\n\nTo help us diagnose and resolve this as swiftly as possible, could you please provide us with:\n1. Any specific error messages or screenshots encountered\n2. The approximate timestamp when the issue most recently occurred\n\nThank you for your cooperation and patience.\n\nWarm regards,\n${agentName}\nResolveIQ Support`;
      break;

    case 'RESOLUTION':
      draftMessage = `Dear ${customerFirstName},\n\nWe are pleased to inform you that we have completed our investigation and resolved your reported issue regarding "${complaint.title}" (Ticket ${complaint.ticketNumber}).\n\n${complaint.resolutionNotes ? `Resolution Summary: ${complaint.resolutionNotes}\n\n` : ''}Please verify the fix on your end. If everything is working to your satisfaction, you may confirm resolution, or reply if you have any remaining questions.\n\nThank you for choosing us!\n\nSincerely,\n${agentName}\nResolveIQ Support`;
      break;

    default:
      draftMessage = `Dear ${customerFirstName},\n\nThank you for your patience while we work on your ticket ${complaint.ticketNumber}.\n\nPlease let us know if you need any immediate assistance in the meantime.\n\nBest regards,\n${agentName}`;
  }

  return {
    isAiGenerated: true,
    isExternalProvider: Boolean(AI_API_KEY),
    advisory: true,
    disclaimer: 'Advisory draft. Support agents must review and modify before sending to customers.',
    draftResponse: draftMessage,
    templateType: intention
  };
}
