import { WeatherData } from '../types';

// Coordinates for Woombye, QLD
const LAT = -26.66;
const LON = 152.96;

const parseMeteoResponse = (json: any): WeatherData[] => {
  if (!json.daily || !json.daily.time) return [];
  return json.daily.time.map((date: string, index: number) => ({
    date: date,
    tempMax: json.daily.temperature_2m_max[index] || 0,
    rain: json.daily.precipitation_sum[index] || 0
  }));
};

export const fetchWeatherHistory = async (startDate: string, endDate: string): Promise<WeatherData[]> => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Open-Meteo Archive API generally requires data to be older than ~5 days.
    // We set a safe cutoff of 7 days ago to handle timezone differences and API latency.
    const today = new Date();
    const cutoffDate = new Date(today.valueOf() - 7 * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    // Case 1: Entire range is Recent (Start date is after cutoff) -> Use Forecast API
    // Note: Comparing timestamps
    if (start.getTime() > cutoffDate.getTime()) {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,precipitation_sum&timezone=Australia%2FBrisbane`;
      const res = await fetch(url);
      if (!res.ok) return []; 
      const json = await res.json();
      return parseMeteoResponse(json);
    }

    // Case 2: Entire range is Historical (End date is before or equal cutoff) -> Use Archive API
    if (end.getTime() <= cutoffDate.getTime()) {
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,precipitation_sum&timezone=Australia%2FBrisbane`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const json = await res.json();
      return parseMeteoResponse(json);
    }

    // Case 3: Mixed (Spans across the cutoff)
    // We split into two requests to satisfy both APIs.
    
    // Part A: Archive (startDate -> cutoffStr)
    const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${startDate}&end_date=${cutoffStr}&daily=temperature_2m_max,precipitation_sum&timezone=Australia%2FBrisbane`;
    
    // Part B: Forecast (cutoffStr + 1 day -> endDate)
    const nextDay = new Date(cutoffDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];
    
    // Ensure we don't accidentally ask for a start date after the end date 
    // (though logic implies end > cutoff, so nextDay should be <= end usually, but safe to check)
    let forecastPromise = Promise.resolve(null as any);
    
    if (new Date(nextDayStr).getTime() <= end.getTime()) {
        const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&start_date=${nextDayStr}&end_date=${endDate}&daily=temperature_2m_max,precipitation_sum&timezone=Australia%2FBrisbane`;
        forecastPromise = fetch(forecastUrl);
    }

    const [archiveRes, forecastRes] = await Promise.all([
      fetch(archiveUrl),
      forecastPromise
    ]);

    let results: WeatherData[] = [];
    
    if (archiveRes.ok) {
      const json = await archiveRes.json();
      results = [...results, ...parseMeteoResponse(json)];
    }
    
    if (forecastRes && forecastRes.ok) {
      const json = await forecastRes.json();
      results = [...results, ...parseMeteoResponse(json)];
    }

    return results;

  } catch (error) {
    console.error("Failed to fetch weather data:", error);
    // Return empty array to keep app functional even if weather fails
    return [];
  }
};