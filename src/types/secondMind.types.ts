export type NoteType = 'note' | 'reflection' | 'learning' | 'anger_log' | 'gratitude';

export interface Note {
  id: string;
  userId: string;
  title?: string;
  content: string;
  type: NoteType;
  tags: string[];
  phase?: number;
  isPinned: boolean;
  imageUris: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PrimingItem {
  id: string;
  userId: string;
  title: string;
  imageUri: string;
  affirmation?: string;
  category: 'goal' | 'motivation' | 'identity' | 'fear';
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
}

export interface PersonalMetric {
  id: string;
  userId: string;
  metricName: string;
  metricType: 'scale' | 'boolean' | 'number' | 'text';
  unit?: string;
  isActive: boolean;
  orderIndex: number;
  createdAt: string;
}

export interface MetricEntry {
  id: string;
  metricId: string;
  userId: string;
  value: string;
  date: string;
  notes?: string;
  createdAt: string;
}
