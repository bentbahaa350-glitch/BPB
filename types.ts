
export interface UserData {
  age: number;
  weight: number;
  height: number;
  level: string;
  goal: string;
  availableDays: string;
  bodyPhoto?: string;
  mealPhoto?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  images?: string[]; // تم التغيير لدعم مصفوفة صور
}

export interface BodyCalculations {
  bmr: number;
  tdee: number;
  targetCalories: number;
}
