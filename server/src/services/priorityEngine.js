import { PRIORITIES } from '../config/constants.js';

/**
 * Priority Calculation Engine
 * Deterministically determines suggested priority based on:
 * 1. Business Impact
 * 2. Urgency
 * 3. Affected Users Count
 * 4. Complaint Category
 */
export function calculateSuggestedPriority({ impact = 'Moderate', urgency = 'Normal', affectedUsers = 1, categoryName = '' }) {
  let score = 0;
  const breakdown = [];

  // 1. Impact Scoring (Max 40 pts)
  const normImpact = String(impact).toLowerCase();
  if (normImpact.includes('critical') || normImpact.includes('severe') || normImpact.includes('outage')) {
    score += 40;
    breakdown.push('Critical business impact (+40)');
  } else if (normImpact.includes('high') || normImpact.includes('major')) {
    score += 28;
    breakdown.push('High business impact (+28)');
  } else if (normImpact.includes('moderate') || normImpact.includes('medium')) {
    score += 16;
    breakdown.push('Moderate business impact (+16)');
  } else {
    score += 6;
    breakdown.push('Low / cosmetic impact (+6)');
  }

  // 2. Urgency Scoring (Max 30 pts)
  const normUrgency = String(urgency).toLowerCase();
  if (normUrgency.includes('critical') || normUrgency.includes('immediate')) {
    score += 30;
    breakdown.push('Immediate urgency required (+30)');
  } else if (normUrgency.includes('high') || normUrgency.includes('urgent')) {
    score += 20;
    breakdown.push('High operational urgency (+20)');
  } else if (normUrgency.includes('normal') || normUrgency.includes('medium')) {
    score += 12;
    breakdown.push('Normal urgency SLA (+12)');
  } else {
    score += 4;
    breakdown.push('Flexible / low urgency (+4)');
  }

  // 3. Affected Users Scoring (Max 20 pts)
  const count = parseInt(affectedUsers, 10) || 1;
  if (count > 100) {
    score += 20;
    breakdown.push(`Mass customer impact (${count} users affected) (+20)`);
  } else if (count > 25) {
    score += 15;
    breakdown.push(`Multi-user group impact (${count} users affected) (+15)`);
  } else if (count > 5) {
    score += 10;
    breakdown.push(`Several users affected (${count} users) (+10)`);
  } else if (count > 1) {
    score += 5;
    breakdown.push(`Multiple users affected (${count} users) (+5)`);
  } else {
    score += 2;
    breakdown.push('Single user affected (+2)');
  }

  // 4. Category Criticality Bonus (Max 10 pts)
  const normCat = String(categoryName).toLowerCase();
  if (normCat.includes('outage') || normCat.includes('security') || normCat.includes('privacy')) {
    score += 10;
    breakdown.push('Critical system domain (Outage / Security) (+10)');
  } else if (normCat.includes('billing') || normCat.includes('payment') || normCat.includes('access')) {
    score += 6;
    breakdown.push('High-sensitivity domain (Billing / Authentication) (+6)');
  } else {
    score += 2;
    breakdown.push('Standard domain category (+2)');
  }

  // Priority Determination Thresholds
  let suggestedPriority;
  let explanation;

  if (score >= 75) {
    suggestedPriority = PRIORITIES.CRITICAL;
    explanation = `Calculated Priority: CRITICAL (Score: ${score}/100). High business disruption or broad customer impact detected. Factors: ${breakdown.join('; ')}.`;
  } else if (score >= 55) {
    suggestedPriority = PRIORITIES.HIGH;
    explanation = `Calculated Priority: HIGH (Score: ${score}/100). Significant operational impact or urgent response needed. Factors: ${breakdown.join('; ')}.`;
  } else if (score >= 32) {
    suggestedPriority = PRIORITIES.MEDIUM;
    explanation = `Calculated Priority: MEDIUM (Score: ${score}/100). Standard customer issue with workable alternatives. Factors: ${breakdown.join('; ')}.`;
  } else {
    suggestedPriority = PRIORITIES.LOW;
    explanation = `Calculated Priority: LOW (Score: ${score}/100). Minor inquiry or cosmetic bug without operational blockage. Factors: ${breakdown.join('; ')}.`;
  }

  return {
    suggestedPriority,
    score,
    explanation,
    breakdown
  };
}
