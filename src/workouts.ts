export type WorkoutType = 'kegel' | 'breath' | 'bodywork' | 'education';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Workout {
  id: string;
  nameKey: string;
  type: WorkoutType;
  icon: string;
  minDifficulty: Difficulty;
  category: 'Sexual Health' | 'Stress Relief' | 'Body Awareness' | 'Breathing';
  implemented: boolean;
}

// Lista wszystkich dostępnych treningów
export const WORKOUTS: Workout[] = [
  {
    id: 'kegel-normal',
    nameKey: 'kegelNormal',
    type: 'kegel',
    icon: 'target',
    minDifficulty: 'beginner',
    category: 'Sexual Health',
    implemented: true,
  },
  {
    id: 'kegel-reverse',
    nameKey: 'kegelReverse',
    type: 'kegel',
    icon: 'arrow-right',
    minDifficulty: 'intermediate',
    category: 'Sexual Health',
    implemented: true,
  },
  {
    id: 'breathing-calm',
    nameKey: 'breathingCalm',
    type: 'breath',
    icon: 'wind',
    minDifficulty: 'beginner',
    category: 'Stress Relief',
    implemented: true,
  },
  {
    id: 'breathing-4-7-8',
    nameKey: 'breathing478',
    type: 'breath',
    icon: 'moon',
    minDifficulty: 'beginner',
    category: 'Stress Relief',
    implemented: true,
  },
  {
    id: 'breathing-box',
    nameKey: 'breathingBox',
    type: 'breath',
    icon: 'grid',
    minDifficulty: 'beginner',
    category: 'Stress Relief',
    implemented: false,
  },
  {
    id: 'breathing-arousal',
    nameKey: 'breathingArousal',
    type: 'breath',
    icon: 'heart-pulse',
    minDifficulty: 'beginner',
    category: 'Sexual Health',
    implemented: false,
  },
  {
    id: 'wim-hof',
    nameKey: 'wimHof',
    type: 'breath',
    icon: 'flame',
    minDifficulty: 'intermediate',
    category: 'Stress Relief',
    implemented: false,
  },
  {
    id: 'body-scan',
    nameKey: 'bodyScan',
    type: 'bodywork',
    icon: 'sparkles',
    minDifficulty: 'beginner',
    category: 'Body Awareness',
    implemented: false,
  },
  {
    id: 'pelvic-release',
    nameKey: 'pelvicRelease',
    type: 'bodywork',
    icon: 'leaf',
    minDifficulty: 'intermediate',
    category: 'Sexual Health',
    implemented: false,
  },
];

export function getWorkoutById(id: string): Workout | undefined {
  return WORKOUTS.find((w) => w.id === id);
}

export function getWorkoutsByType(type: WorkoutType): Workout[] {
  return WORKOUTS.filter((w) => w.type === type);
}

export function getWorkoutsByCategory(category: string): Workout[] {
  return WORKOUTS.filter((w) => w.category === category);
}
