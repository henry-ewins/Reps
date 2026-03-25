export interface DocumentInfo {
  title: string;
  type: string;
  date: string;
  url: string;
  text?: string;
}

export type CommentCategory = 'Objection' | 'Support' | 'Neutral';

export interface RepresentationComment {
  category: CommentCategory;
  summary: string;
  source: string;
  date: string;
}

export interface CommentStats {
  total: number;
  objections: number;
  support: number;
  neutral: number;
}

export interface CategorySummary {
  category: CommentCategory;
  summary: string;
}

export interface OfficerReportSection {
  category: CommentCategory;
  count: number;
  grounds: string[];
}

export interface ProcessingResult {
  reference: string;
  address: string;
  stats: CommentStats;
  categorySummaries: CategorySummary[];
  officerReport: OfficerReportSection[];
  keywords: KeywordEntry[];
  sources: SourceEntry[];
}

export interface KeywordEntry {
  word: string;
  count: number;
}

export interface SourceEntry {
  url: string;
  label: string;
}
