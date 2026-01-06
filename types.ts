export type DoorType = 'fridge' | 'freezer';

export interface DoorConfig {
  id: string;
  name: string;
  type: DoorType;
}

export interface UserProfile {
  id: string;
  name: string;
  restrictions: string; // e.g., "우유 알러지", "채식"
}

export interface FridgeConfig {
  name: string;
  doorCount: 1 | 2 | 4;
  doors: DoorConfig[];
  userProfiles: UserProfile[];
  isSetup: boolean;
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
}

export interface BackupData {
  config: FridgeConfig;
  items: FoodItem[];
  categories: string[];
  version: number;
  timestamp: number;
}