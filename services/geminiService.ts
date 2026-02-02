import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Observation, AnalysisResponse, WeatherData } from '../types';
import { LOCATION_CONTEXT } from '../constants';
import { fetchWeatherHistory } from './weatherService';

const getContextString = (data: Observation[], weather: WeatherData[]): string => {
  const sortedData = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Create a map for fast weather lookup
  const weatherMap = new Map(weather.map(w => [w.date, w]));

  return sortedData
    .map(d => {
      const w = weatherMap.get(d.date);
      const weatherStr = w ? ` | Weather: ${w.tempMax}°C, ${w.rain}mm Rain` : '';
      return `${d.date}: Bats=${d.bats}%, Figs=${d.figs}%, Leaves=${d.leaves}%${weatherStr}`;
    })
    .join('\n');
};

const getRange = (data: Observation[]) => {
  if (data.length === 0) return { start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] };
  const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return {
    start: sorted[0].date,
    end: sorted[sorted.length - 1].date
  };
};

export const analyzeData = async (data: Observation[]): Promise<AnalysisResponse | null> => {
  if (!process.env.API_KEY) {
    console.error("API Key is missing.");
    return null;
  }

  // 1. Fetch Weather Context
  const { start, end } = getRange(data);
  const weatherData = await fetchWeatherHistory(start, end);

  // 2. Prepare Data String
  const recentData = getContextString(data, weatherData);
  const latestDate = data.length > 0 ? data[0].date : new Date().toISOString().split('T')[0];

  const prompt = `
    You are an expert ecologist and data analyst specializing in Australian wildlife and phenology, specifically in ${LOCATION_CONTEXT}.
    
    The user has provided monitoring data for a **Moreton Bay Fig (Ficus macrophylla)** along with **Historical Weather Data** (Temperature & Rainfall) for Woombye, QLD.
    
    **Metrics Interpretation (0-100 Scale):**
    The data represents the **Percentage of Impact/Activity** observed by the user.
    - **0**: 0% impact/activity (Nothing happening, no fruit, no bats).
    - **100**: 100% maximum impact (Constant high volume of fruit dropping, many loud bats throughout the night, full canopy).
    
    **Specific Metrics:**
    - **Bats**: Volume and intensity of Flying Fox activity/presence.
    - **Figs**: Abundance of ripe fruit/fruit drop impact.
    - **Leaves**: Canopy coverage percentage.

    Current Reference Date: ${latestDate}
    
    Here is the combined Data Log:
    ${recentData}

    **Task:**
    Analyze this data to provide a "Snapshot", a "Deep Dive Report", and "Predictive Data Points".
    
    **CRITICAL ANALYSIS INSTRUCTIONS:**
    1. **Weather Correlations:** You MUST analyze the relationship between the provided Rainfall/Temperature data and the biological metrics for the *Ficus macrophylla*. (e.g., "Bat numbers increased 2 days after the heavy 45mm rainfall on [Date]").
    2. **Phenology:** Identify the current phase of the Moreton Bay Fig.
    3. **Prediction:** Estimate the next major fruiting event.
    4. **Graph Data:** Generate a set of predicted data points for "Figs" (representing the **% Probability of Fruiting Event**, 0-100) for the remaining months of the current year and the entirety of the next year.

    **Output Format:**
    Return the result as a JSON object matching the requested schema. 
    - 'headline': A catchy, 1-sentence summary mentioning a key correlation found.
    - 'currentPhase': 2-3 words describing the tree state.
    - 'nextEvent': Prediction for the next major biological event.
    - 'environmentalContext': A specific insight derived from the weather data provided (e.g. "Recent heavy rains may trigger flushing").
    - 'detailedReport': A professional Markdown formatted report highlighting weather correlations and specific Ficus macrophylla behaviors.
    - 'predictionPoints': An array of objects { "date": "YYYY-MM-DD", "figs": number }.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      headline: { type: Type.STRING },
      currentPhase: { type: Type.STRING },
      nextEvent: { type: Type.STRING },
      environmentalContext: { type: Type.STRING },
      detailedReport: { type: Type.STRING },
      predictionPoints: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            figs: { type: Type.NUMBER },
          },
          required: ["date", "figs"],
        },
      },
    },
    required: ["headline", "currentPhase", "nextEvent", "environmentalContext", "detailedReport", "predictionPoints"],
  };

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });
    
    if (response.text) {
        const result = JSON.parse(response.text);
        return {
            ...result,
            timestamp: Date.now()
        };
    }
    return null;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
};

export const askSpecificQuestion = async (data: Observation[], question: string): Promise<string | null> => {
  if (!process.env.API_KEY || !question.trim()) return null;

  // Fetch weather for Q&A context as well
  const { start, end } = getRange(data);
  const weatherData = await fetchWeatherHistory(start, end);

  const contextData = getContextString(data, weatherData);
  
  const prompt = `
    Context: Use the following ecological data (including local weather from Woombye, QLD) for a **Moreton Bay Fig (Ficus macrophylla)** to answer the user's question.
    
    **Metric Key (0-100% Impact):**
    - 0 = No activity/impact.
    - 100 = Maximum activity/impact (Loud bats, heavy fruit drop).

    Data Log:
    ${contextData}

    User Question: "${question}"

    Answer concisely and professionally as an ecologist. Cite specific weather events (rain/temp) if relevant to the answer.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "I couldn't generate an answer at this time.";
  } catch (error) {
    console.error("Gemini Q&A Error:", error);
    return "Sorry, I encountered an error while processing your question.";
  }
};