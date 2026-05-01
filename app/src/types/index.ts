export type AgentRole = 'frontend' | 'backend' | 'devops' | 'qa' | 'lead';
export type AgentStatus = 'active' | 'idle' | 'busy' | 'error' | 'offline';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ActionType = 'commit' | 'deploy' | 'test' | 'migrate' | 'refactor' | 'create' | 'delete';
export type Environment = 'development' | 'staging' | 'production';

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  avatar: string;
  description: string;
  currentTask?: string;
  tasksCompleted: number;
  tasksFailed: number;
  uptime: string;
  lastActivity: string;
  version: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string;
  assigneeName?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  entityType: string;
  entityId: string;
  progress: number;
  actions: ActionLog[];
}

export interface ActionLog {
  id: string;
  agentId: string;
  agentName: string;
  action: ActionType;
  target: string;
  status: 'success' | 'error' | 'denied';
  timestamp: string;
  duration: number;
  humanApproved: boolean;
  details?: string;
}

export interface ApprovalRequest {
  id: string;
  action: ActionType;
  target: string;
  targetType: string;
  requestedBy: string;
  requesterRole: AgentRole;
  environment: Environment;
  status: ApprovalStatus;
  requestedAt: string;
  resolvedAt?: string;
  risk: 'low' | 'medium' | 'high';
  description: string;
  diff?: string;
}

export interface OntologyEntity {
  id: string;
  type: string;
  name: string;
  properties: Record<string, string>;
  relationships: OntologyRelationship[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface OntologyRelationship {
  type: string;
  targetId: string;
  targetName: string;
  targetType: string;
}

export interface DashboardStats {
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  pendingApprovals: number;
  recentActions: number;
  uptime: string;
  avgResponseTime: string;
}

export interface AgentMetrics {
  timestamp: string;
  tasksPerHour: number;
  successRate: number;
  avgDuration: number;
}
