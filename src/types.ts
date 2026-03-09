export interface Sprint {
  id: number;
  label: string;
  start: string; // YYYY-MM-DD
}

export interface Milestone {
  id: number;
  label: string;
  date: string; // YYYY-MM-DD
}

export interface Deliverable {
  id: number;
  label: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

export interface Row {
  id: number;
  label: string;
  color: string;
  deliverables: Deliverable[];
}

export interface AppState {
  title: string;
  dateStart: string;
  dateEnd: string;
  sprints: Sprint[];
  milestones: Milestone[];
  rows: Row[];
}

export interface HitArea {
  d: Deliverable;
  row: Row;
  x1: number;
  barTop: number;
  x2: number;
  barBottom: number;
}

export interface RowBound {
  row: Row;
  top: number;
  height: number;
}

export interface LayoutCache {
  chartLeft: number;
  chartWidth: number;
  dateStartMs: number;
  totalMs: number;
  dataTop: number;
}

export interface DragState {
  d: Deliverable;
  sourceRow: Row;
  targetRow: Row;
  offsetX: number;
  duration: number;
  snapStart: string;
  snapEnd: string;
}

export interface ModalField {
  name: string;
  label: string;
  type: 'text' | 'date' | 'color' | 'textarea';
  value: string;
}

export interface ModalOptions {
  title: string;
  fields: ModalField[];
  onSave: (values: Record<string, string>) => void;
  onDelete?: () => void;
}

export interface TrackAssignment {
  numTracks: number;
  trackMap: Map<number, number>;
}

export interface RowLayout {
  numTracks: number;
  trackMap: Map<number, number>;
  trackHeights: number[];
  totalH: number;
}
