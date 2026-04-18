// Writing progress tracking types

export interface WritingProgress {
  id: string;
  projectId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  wordsWritten: number;
  totalWords: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectProgress {
  projectId: string;
  targetWordCount: number;
  currentWordCount: number;
  dailyProgress: WritingProgress[];
  totalDaysWriting: number;
  averageWordsPerDay: number;
  currentStreak: number;
  longestStreak: number;
}

export interface UpdateProgressInput {
  date: string;
  wordsWritten: number;
}