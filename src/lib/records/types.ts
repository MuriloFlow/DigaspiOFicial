export type OperatorRecord = {
  id: string;
  collaboratorId: string;
  operatorName: string;
  clientName: string;
  amountInCents: number;
  activated: boolean;
  createdAt: string;
};

export type OperatorSummary = {
  operatorName: string;
  collaboratorId?: string;
  count: number;
  totalInCents: number;
  averageInCents: number;
  percentage: number;
  color: string;
};

export type DateGroup = {
  dateKey: string;
  label: string;
  relativeLabel: string;
  records: OperatorRecord[];
  count: number;
  totalInCents: number;
  operators: OperatorSummary[];
};

export type DashboardSummary = {
  totalCards: number;
  totalAmountInCents: number;
  operatorCount: number;
  topOperator: OperatorSummary | null;
};

export type RecordsPayload = {
  records: OperatorRecord[];
  summary: DashboardSummary;
};

export type CreateRecordPayload = {
  operatorName: string;
  clientName: string;
  amountInCents: number;
  activated: boolean;
};

export type Collaborator = {
  id: string;
  name: string;
  created_at: string;
  recordCount?: number;
  totalInCents?: number;
};
