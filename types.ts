
export type DoorType = 'fridge' | 'freezer' | 'pantry';

export interface DoorConfig {
  id: string;
  name: string;
  type: DoorType;
}

export interface Fridge {
  id: string;
  name: string;
  doorCount: 1 | 2 | 3 | 4;
  doors: DoorConfig[];
}

export interface UserProfile {
  id: string;
  name: string;
  restrictions: string; // e.g., "우유 알러지", "채식"
}

export interface FridgeConfig {
  // Global Settings
  name: string; // Used as the "Main Family Name" or default fridge name fallback
  userProfiles: UserProfile[];
  isSetup: boolean;
  
  // Multi-fridge support
  fridges: Fridge[];

  // Legacy fields (optional, kept for type safety during migration if needed)
  doorCount?: 1 | 2 | 4;
  doors?: DoorConfig[];
}

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  entryDate: number; // Timestamp
  expirationDate?: number; // Timestamp
  doorId: string;
}

export type SortMode = 'recent' | 'oldest' | 'name' | 'quantity' | 'expiration';

export interface WeatherData {
  temp: number;
  condition: string;
  forecast: string;
  humidity: number;
  wind: string;
  pm25: string;
  code?: number; // WMO Weather Code for icon mapping
}

export interface RecipeIngredient {
  name: string;
  isAvailable: boolean; // True if in fridge, false if needs buying
}

export interface RecipeSuggestion {
  title: string;
  description: string;
  calories: number;
  timeOfDay: string;
  matchPercentage: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  warning?: string;
  youtubeQuery: string; // Optimization keyword for YouTube search
}

export interface BackupData {
  config: FridgeConfig;
  items: FoodItem[];
  categories: string[];
  version: number;
  timestamp: number;
}
