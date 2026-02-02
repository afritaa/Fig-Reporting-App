import { WeatherData } from '../types';

// Coordinates for Woombye, QLD
const LAT = -26.66;
const LON = 152.96;

export const fetchWeatherHistory = async (startDate: string, endDate: string): Promise<WeatherData[]> => {
  try {
    // Using Open-Meteo Archive API (Free, no key required)
    // Fetching Max Temp and Precipitation Sum
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,precipitation_sum&timezone=Australia%2FBrisbane`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather API failed');
    
    const json = await response.json();
    
    if (!json.daily || !json.daily.time) return [];

    const weatherList: WeatherData[] = json.daily.time.map((date: string, index: number) => ({
      date: date,
      tempMax: json.daily.temperature_2m_max[index] || 0,
      rain: json.daily.precipitation_sum[index] || 0
    }));

    return weatherList;
  } catch (error) {
    console.error("Failed to fetch weather data:", error);
    return [];
  }
};