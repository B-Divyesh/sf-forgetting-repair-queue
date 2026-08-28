export type Decision = 'revise' | 'split' | 'suspend' | 'archive';

export interface CardAnalysis {
  id: string;
  sourceId: string;
  question: string;
  answer: string;
  deck: string;
  recentReviews: number;
  recentFailures: number;
  failureRate: number;
  averageMs: number | null;
  score: number;
  failurePoints: number;
  timePoints: number;
  repeatPoints: number;
}

export interface AnalysisResult {
  format: 'card summary' | 'review log';
  cards: CardAnalysis[];
  columns: string[];
  recognized: string[];
  warning?: string;
}

export interface DataSet extends AnalysisResult {
  id: string;
  filename: string;
  importedAt: string;
  raw: string;
}

export interface Repair {
  cardId: string;
  decision: Decision;
  prompt: string;
  answer: string;
  splitA: string;
  splitB: string;
  note: string;
  checks: string[];
  updatedAt: string;
}

export interface AppData {
  dataset: DataSet;
  repairs: Repair[];
}
