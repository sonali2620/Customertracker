import prisma from '../config/db.js';
import { ROLES, STATUSES } from '../config/constants.js';

/**
 * Deterministic Agent Assignment Service
 * Assigns an incoming complaint to the best-suited active agent based on:
 * - Skill match for the complaint category
 * - Agent active status
 * - Current active workload vs max workload capacity
 * - Deterministic tie-breaker (lowest workload, then alphabetical ID)
 */
export async function findBestAgentForComplaint(categoryId, categoryName = '') {
  // 1. Fetch all active agents
  const activeAgents = await prisma.user.findMany({
    where: {
      role: ROLES.AGENT,
      isActive: true
    },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      maxWorkload: true,
      skills: true
    }
  });

  if (!activeAgents || activeAgents.length === 0) {
    return {
      agent: null,
      reason: 'No active support agents currently available in the organization.'
    };
  }

  // 2. Fetch current open workloads for these agents
  // Active statuses that count towards agent capacity
  const activeStatuses = [
    STATUSES.OPEN,
    STATUSES.ASSIGNED,
    STATUSES.IN_PROGRESS,
    STATUSES.WAITING_FOR_CUSTOMER,
    STATUSES.REOPENED
  ];

  const agentWorkloadCounts = await prisma.complaint.groupBy({
    by: ['assignedAgentId'],
    where: {
      assignedAgentId: {
        in: activeAgents.map(a => a.id)
      },
      status: {
        in: activeStatuses
      }
    },
    _count: {
      id: true
    }
  });

  const workloadMap = {};
  agentWorkloadCounts.forEach(item => {
    if (item.assignedAgentId) {
      workloadMap[item.assignedAgentId] = item._count.id;
    }
  });

  // 3. Compute capacity and skill alignment for each agent
  const eligibleAgents = activeAgents
    .map(agent => {
      const currentWorkload = workloadMap[agent.id] || 0;
      const capacityRemaining = agent.maxWorkload - currentWorkload;
      
      // Skill match check: if agent has category skill listed or has no specific restrictions
      const hasSkill = Array.isArray(agent.skills) && agent.skills.length > 0
        ? agent.skills.some(skill => 
            skill.toLowerCase().includes(categoryName.toLowerCase()) || 
            categoryName.toLowerCase().includes(skill.toLowerCase()) ||
            skill.toLowerCase() === 'general'
          )
        : true; // If no skills specified, considered a general agent

      return {
        ...agent,
        currentWorkload,
        capacityRemaining,
        hasSkill
      };
    })
    .filter(agent => agent.capacityRemaining > 0); // Must have capacity available

  if (eligibleAgents.length === 0) {
    return {
      agent: null,
      reason: 'All active agents have reached their maximum workload capacity.'
    };
  }

  // 4. Sort deterministically:
  // 1st: Skill match (true before false)
  // 2nd: Lowest current workload
  // 3rd: Alphabetical ID as deterministic tie-breaker
  eligibleAgents.sort((a, b) => {
    if (a.hasSkill !== b.hasSkill) {
      return a.hasSkill ? -1 : 1;
    }
    if (a.currentWorkload !== b.currentWorkload) {
      return a.currentWorkload - b.currentWorkload;
    }
    return a.id.localeCompare(b.id);
  });

  const selectedAgent = eligibleAgents[0];
  const skillMatchNote = selectedAgent.hasSkill ? 'Skill match' : 'General queue assignment';

  return {
    agent: selectedAgent,
    reason: `Assigned to ${selectedAgent.name} (${skillMatchNote}, Current Workload: ${selectedAgent.currentWorkload}/${selectedAgent.maxWorkload}).`
  };
}
