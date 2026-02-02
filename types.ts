export interface Observation {
  id: string;
  date: string; // ISO 8601 YYYY-MM-DD
  bats: number; // 0-100
  figs: number; // 0-100
  leaves: number; // 0-100
  // Optional weather data for display purposes if available
  rain?: number; 
  tempMax?: number;
}

export interface WeatherData {
  date: string;
  rain: number; // mm
  tempMax: number; // celsius
}

export enum TabView {
  DASHBOARD = 'DASHBOARD',
  INSIGHT = 'INSIGHT',
  ASK = 'ASK',
  MENU = 'MENU',
  ENTRY = 'ENTRY',
  DATA = 'DATA',
  SETTINGS = 'SETTINGS'
}

export interface PredictionPoint {
  date: string; // YYYY-MM-DD
  figs: number;
}

export interface AnalysisResponse {
  headline: string;
  currentPhase: string;
  nextEvent: string;
  environmentalContext: string;
  detailedReport: string;
  predictionPoints: PredictionPoint[];
  timestamp: number;
}