import { Observation } from '../types';

const STORAGE_KEY = 'fig_bat_data_v1';

export const getObservations = (): Observation[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return [];
  }
  try {
    const parsed = JSON.parse(stored);
    // Sort by date descending (Newest first)
    return parsed.sort((a: Observation, b: Observation) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (e) {
    console.error("Failed to parse stored data", e);
    return [];
  }
};

export const saveObservation = (obs: Observation): Observation[] => {
  const current = getObservations();
  const existingIndex = current.findIndex(o => o.date === obs.date);
  
  let updated: Observation[];
  if (existingIndex >= 0) {
    // Update existing for that date
    updated = [...current];
    updated[existingIndex] = { ...obs, id: current[existingIndex].id };
  } else {
    // Add new
    updated = [obs, ...current];
  }
  
  // Sort again just in case (Newest first)
  updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const deleteObservation = (id: string): Observation[] => {
  const current = getObservations();
  const updated = current.filter(o => o.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const exportToCSV = (data: Observation[]): string => {
  // Exports in the format: A=Date, B=Figs, C=Bats, D=Leaves
  const header = "Date,Figs,Bats,Leaves";
  const rows = data.map(d => `${d.date},${d.figs},${d.bats},${d.leaves}`);
  return [header, ...rows].join('\n');
};

const parseDate = (rawDate: string): string | null => {
  if (!rawDate) return null;
  rawDate = rawDate.trim();

  // Remove any time component if present (e.g. "2023-10-01 12:00:00" or "01/10/2023 10:00")
  const datePart = rawDate.split(' ')[0];

  // 1. ISO Format (YYYY-MM-DD)
  const isoMatch = datePart.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    const isoString = `${year}-${month}-${day}`;
    // Basic validity check
    const d = new Date(isoString);
    return !isNaN(d.getTime()) ? isoString : null;
  }

  // 2. DD/MM/YYYY or D-M-YYYY or DD/MM/YY
  // Captures: 1=Day, 2=Month, 3=Year (2 or 4 digits)
  const slashMatch = datePart.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    let year = slashMatch[3];
    
    // Handle 2 digit year
    if (year.length === 2) {
        // Pivot year: if > 50 assumes 19xx, else 20xx.
        // Simple heuristic for monitoring data.
        year = `20${year}`; 
    }

    return `${year}-${month}-${day}`;
  }

  // 3. DDMMYYYY (Compact)
  const compactMatch = datePart.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (compactMatch) {
    const day = compactMatch[1];
    const month = compactMatch[2];
    const year = compactMatch[3];
    return `${year}-${month}-${day}`;
  }

  return null;
};

export const importFromCSV = (input: string): Observation[] => {
  if (!input || !input.trim()) return [];

  // Split by newline
  const lines = input.trim().split(/\r\n|\n/);
  const observations: Observation[] = [];
  
  // Detect delimiter
  const firstLine = lines.find(l => l.trim().length > 0) || "";
  const delimiter = firstLine.includes('\t') ? '\t' : ',';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple split - creates array of values
    const parts = line.split(delimiter).map(p => p.trim());
    
    // Check minimum columns (Date, Figs, Bats)
    if (parts.length >= 3) {
      const rawDate = parts[0];
      const formattedDate = parseDate(rawDate);

      // Parse logic:
      // - Empty/Null/Undefined => 0 (Assume 0 if data missing)
      // - Number => Number
      // - Text/Invalid => NaN (This allows us to skip header rows)
      const parseValue = (val: string) => {
        if (val === '' || val === null || val === undefined) return 0;
        const num = parseFloat(val); // parseFloat handles "20" and "20.5"
        return isNaN(num) ? NaN : num;
      };

      const figsVal = parseValue(parts[1]);
      const batsVal = parseValue(parts[2]);
      
      // Leaves is optional
      // Check if parts[3] exists, if so parse it, else 0.
      const leavesVal = parts.length >= 4 ? parseValue(parts[3]) : 0;

      // Only add if:
      // 1. Date is valid (matches strict regex)
      // 2. Figs AND Bats are valid numbers (NaN means it was text/header)
      //    We now allow 0 (from empty string), so we just check !isNaN.
      if (formattedDate && !isNaN(figsVal) && !isNaN(batsVal)) {
        observations.push({
          id: Math.random().toString(36).substr(2, 9),
          date: formattedDate,
          figs: Math.round(figsVal), // Ensure integer
          bats: Math.round(batsVal),
          leaves: isNaN(leavesVal) ? 0 : Math.round(leavesVal)
        });
      }
    }
  }
  
  if (observations.length > 0) {
    // Sort descending by date (Newest first)
    observations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(observations));
  }
  return observations;
};

export const fetchGoogleSheet = async (url: string): Promise<Observation[]> => {
  let fetchUrl = '';
  
  // Construct export URL
  if (url.includes('output=csv')) {
    fetchUrl = url;
  } else {
    // 1. Extract Spreadsheet ID
    const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!idMatch || !idMatch[1]) {
      throw new Error("Invalid Google Sheet URL. Could not find Spreadsheet ID.");
    }
    const id = idMatch[1];

    // 2. Extract GID (Sheet/Tab ID)
    const gidMatch = url.match(/[#&?]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : '0';

    fetchUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
  }

  try {
    const response = await fetch(fetchUrl);
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      throw new Error("Access denied. The sheet must be 'Published to the web' or have 'Anyone with the link' access.");
    }

    if (!response.ok) {
      throw new Error(`Google Sheets returned status ${response.status}.`);
    }

    const csvText = await response.text();
    
    const obs = importFromCSV(csvText);
    
    if (obs.length === 0) {
      throw new Error("No valid data rows found. Ensure columns are A=Date, B=Figs, C=Bats.");
    }
    
    return obs;

  } catch (error: any) {
    console.error("Fetch error:", error);
    throw new Error(error.message || "Failed to fetch data.");
  }
};