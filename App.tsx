import React, { useState, useEffect, useMemo } from 'react';
import { 
  Leaf, 
  Sprout, 
  Cat, 
  BarChart3, 
  PlusCircle, 
  Table as TableIcon, 
  Settings,
  Calendar,
  CloudSun,
  Filter,
  Sparkles,
  Moon,
  Sun,
  Menu as MenuIcon,
  MessageCircle,
  RefreshCw,
  AlertCircle,
  CloudRain
} from 'lucide-react';
import { 
  ComposedChart,
  Area, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

import { Observation, TabView, AnalysisResponse, WeatherData } from './types';
import { getObservations, saveObservation, deleteObservation, fetchGoogleSheet } from './services/storageService';
import { analyzeData } from './services/geminiService';
import { fetchWeatherHistory } from './services/weatherService';
import SliderInput from './components/SliderInput';
import AnalysisView from './components/AnalysisView';
import AnalysisSnapshot from './components/AnalysisSnapshot';
import AskView from './components/AskView';
import DataSync from './components/DataSync';

const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1yyWzM30TzFoMyt14Vi6MpkE__SA2qlTDE-8rbL2dyxE/edit?usp=sharing';

const App = () => {
  const [activeTab, setActiveTab] = useState<TabView>(TabView.DASHBOARD);
  const [data, setData] = useState<Observation[]>([]);
  const [weatherHistory, setWeatherHistory] = useState<WeatherData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // Dashboard State
  const [chartYear, setChartYear] = useState<string>(new Date().getFullYear().toString());

  // Analysis State
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Entry Form State
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryBats, setEntryBats] = useState(0);
  const [entryFigs, setEntryFigs] = useState(0);
  const [entryLeaves, setEntryLeaves] = useState(50);

  useEffect(() => {
    const initData = async () => {
      const stored = getObservations();
      let currentData = stored;

      if (stored.length > 0) {
        setData(stored);
      } else {
        try {
          setIsLoading(true);
          const defaultData = await fetchGoogleSheet(DEFAULT_SHEET_URL);
          setData(defaultData);
          currentData = defaultData;
        } catch (e) {
          console.error("Failed to load default data", e);
        } finally {
          setIsLoading(false);
        }
      }

      // Fetch Weather for the data range found
      if (currentData.length > 0) {
        // Find date range
        const dates = currentData.map(d => new Date(d.date).getTime());
        const minDate = new Date(Math.min(...dates)).toISOString().split('T')[0];
        const maxDate = new Date(Math.max(...dates)).toISOString().split('T')[0];
        
        try {
          const weather = await fetchWeatherHistory(minDate, maxDate);
          setWeatherHistory(weather);
        } catch (err) {
          console.error("Weather fetch failed", err);
        }
      }
    };
    initData();
  }, []);

  const handleAnalyze = async () => {
    if (data.length < 3) {
      setAnalysisError("Please add at least 3 observations to generate a meaningful trend analysis.");
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    // Switch to dashboard if not already there, to show loading state
    setActiveTab(TabView.DASHBOARD);

    const result = await analyzeData(data);
    
    if (result) {
      setAnalysis(result);
    } else {
      setAnalysisError("Could not generate analysis. Please check your connection.");
    }
    setIsAnalyzing(false);
  };

  const handleSaveEntry = () => {
    const newEntry: Observation = {
      id: Math.random().toString(36).substr(2, 9),
      date: entryDate,
      bats: entryBats,
      figs: entryFigs,
      leaves: entryLeaves
    };
    const updated = saveObservation(newEntry);
    setData(updated);
    setActiveTab(TabView.DASHBOARD);
    setEntryBats(0);
    setEntryFigs(0);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      const updated = deleteObservation(id);
      setData(updated);
    }
  };

  const availableYears = useMemo(() => {
    const years = new Set(data.map(d => d.date.split('-')[0]));
    years.add(new Date().getFullYear().toString());
    return Array.from(years).sort().reverse();
  }, [data]);

  const chartConfig = useMemo(() => {
    // 1. Filter Data for selected year
    const filteredData = data.filter(d => d.date.startsWith(chartYear));
    const sorted = [...filteredData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 2. Filter Weather for selected year
    const filteredWeather = weatherHistory.filter(w => w.date.startsWith(chartYear));
    const weatherMap = new Map<string, WeatherData>(filteredWeather.map(w => [w.date, w] as [string, WeatherData]));

    // 3. Merge: We need a continuous timeline if we want nice weather bars, 
    // but the area chart depends on observations. 
    // Strategy: Use observation points, and inject weather data into those points.
    // NOTE: This only shows rain ON days of observation. 
    // Better Strategy for "Enhancement": Create a daily array for the year and fill sparse data? 
    // For simplicity and clarity in a combined chart, we will map existing observations + weather.
    
    const formattedData = sorted.map(d => {
      const weather = weatherMap.get(d.date);
      return {
        ...d,
        dateNum: new Date(d.date).getTime(),
        rain: weather ? weather.rain : 0,
        temp: weather ? weather.tempMax : null
      };
    });

    const yearInt = parseInt(chartYear);
    const startOfYear = new Date(`${yearInt}-01-01`).getTime();
    const endOfYear = new Date(`${yearInt}-12-31`).getTime();
    const domain = [startOfYear, endOfYear];

    const ticks = [];
    for (let i = 1; i <= 12; i++) {
      const m = i.toString().padStart(2, '0');
      ticks.push(new Date(`${yearInt}-${m}-01`).getTime());
    }

    return { data: formattedData, domain, ticks };
  }, [data, chartYear, weatherHistory]);

  // Helper to check if we are in a sub-menu of "MENU"
  const isMenuSectionActive = [TabView.MENU, TabView.ENTRY, TabView.DATA, TabView.SETTINGS].includes(activeTab);

  return (
    <div className={`${darkMode ? 'dark' : ''} h-full`}>
      <div className="min-h-screen pb-20 md:pb-0 md:pl-20 bg-gray-50 dark:bg-gray-950 text-slate-800 dark:text-slate-200 transition-colors duration-300">
        
        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 sticky top-0 z-10 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500">
            <Leaf className="fill-current" />
            <h1 className="font-bold text-lg text-gray-900 dark:text-white">Fig Monitor</h1>
          </div>
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* Desktop Sidebar Navigation */}
        <nav className="hidden md:flex fixed left-0 top-0 h-full w-20 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col items-center py-8 gap-8 shadow-sm z-20 transition-colors duration-300">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600 dark:text-emerald-500">
            <Leaf size={28} />
          </div>
          <div className="flex flex-col gap-6 w-full px-2">
            <NavButton icon={<BarChart3 />} label="Dash" active={activeTab === TabView.DASHBOARD} onClick={() => setActiveTab(TabView.DASHBOARD)} />
            <NavButton icon={<Sparkles />} label="Insight" active={activeTab === TabView.INSIGHT} onClick={() => setActiveTab(TabView.INSIGHT)} />
            <NavButton icon={<MessageCircle />} label="Ask" active={activeTab === TabView.ASK} onClick={() => setActiveTab(TabView.ASK)} />
            <NavButton icon={<MenuIcon />} label="Menu" active={isMenuSectionActive} onClick={() => setActiveTab(TabView.MENU)} />
          </div>
          
          <div className="mt-auto mb-4">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 transition-colors"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </nav>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around p-3 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <MobileNavButton icon={<BarChart3 />} label="Dash" active={activeTab === TabView.DASHBOARD} onClick={() => setActiveTab(TabView.DASHBOARD)} />
          <MobileNavButton icon={<Sparkles />} label="Insight" active={activeTab === TabView.INSIGHT} onClick={() => setActiveTab(TabView.INSIGHT)} />
          <MobileNavButton icon={<MessageCircle />} label="Ask" active={activeTab === TabView.ASK} onClick={() => setActiveTab(TabView.ASK)} />
          <MobileNavButton icon={<MenuIcon />} label="Menu" active={isMenuSectionActive} onClick={() => setActiveTab(TabView.MENU)} />
        </nav>

        <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
          
          {/* DASHBOARD VIEW */}
          {activeTab === TabView.DASHBOARD && (
            <div className="space-y-6 fade-in">
              <header className="mb-6 flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Dashboard</h1>
                  <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                    <CloudSun size={16} />
                    <span className="font-semibold">Moreton Bay Fig</span> Monitor (Woombye, QLD)
                    {weatherHistory.length > 0 && <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full ml-2">Weather Active</span>}
                  </p>
                </div>
                {isLoading && <span className="text-xs font-medium text-emerald-600 animate-pulse">Syncing...</span>}
              </header>

              {/* Analysis Snapshot / CTA Section */}
              <div className="min-h-[160px]">
                {isAnalyzing ? (
                  <div className="h-full bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl flex flex-col items-center justify-center p-8 border border-emerald-100 dark:border-emerald-900/30 animate-pulse">
                    <Sparkles className="text-emerald-500 mb-3 animate-spin-slow" size={32} />
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">Correlating weather & bio data...</span>
                  </div>
                ) : analysis ? (
                  <AnalysisSnapshot analysis={analysis} />
                ) : (
                  <div className="h-full bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
                    <div className="space-y-2 text-center md:text-left">
                       <h2 className="text-2xl font-bold flex items-center justify-center md:justify-start gap-2">
                         <Sparkles size={24} className="text-emerald-200" />
                         Generate AI Insights
                       </h2>
                       <p className="text-emerald-100 max-w-lg">
                         Get a real-time ecological snapshot, forecast prediction, and deep dive analysis based on your monitoring data.
                       </p>
                       {analysisError && (
                          <div className="flex items-center gap-2 text-red-200 bg-red-900/20 px-3 py-1 rounded-lg text-sm">
                             <AlertCircle size={14} /> {analysisError}
                          </div>
                       )}
                    </div>
                    <button
                      onClick={handleAnalyze}
                      disabled={data.length < 3}
                      className="px-8 py-3 bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl font-bold shadow-sm transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Analyze Data
                    </button>
                  </div>
                )}
              </div>

              {/* Main Chart */}
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 min-h-[450px] transition-colors duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <BarChart3 size={18} className="text-emerald-600 dark:text-emerald-500"/>
                    Bio Trends & Rainfall
                  </h2>
                  
                  {/* Year Filter */}
                  <div className="flex gap-2 overflow-x-auto pb-1 max-w-full custom-scrollbar">
                    {availableYears.map(year => (
                      <button
                        key={year}
                        onClick={() => setChartYear(year)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                          chartYear === year 
                            ? 'bg-emerald-600 text-white shadow-sm' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartConfig.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorFigs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#d97706" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#d97706" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#374151' : '#f0f0f0'} />
                      <XAxis 
                        dataKey="dateNum" 
                        type="number"
                        domain={chartConfig.domain as any}
                        ticks={chartConfig.ticks}
                        tickFormatter={(val) => {
                          const d = new Date(val);
                          return d.toLocaleDateString('en-AU', { month: 'short' });
                        }}
                        tick={{fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b'}}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={10}
                      />
                      
                      {/* Left Y Axis: Bio Data (0-100) */}
                      <YAxis 
                        yAxisId="left"
                        tick={{fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b'}} 
                        axisLine={false} 
                        tickLine={false}
                        domain={[0, 100]}
                        label={{ value: '% Impact / Activity', angle: -90, position: 'insideLeft', style: { fill: darkMode ? '#6b7280' : '#9ca3af', fontSize: 10 } }}
                      />
                      
                      {/* Right Y Axis: Rainfall (mm) */}
                      <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        tick={{fontSize: 10, fill: '#3b82f6'}} 
                        axisLine={false} 
                        tickLine={false}
                        label={{ value: 'Rain (mm)', angle: 90, position: 'insideRight', style: { fill: '#60a5fa', fontSize: 10 } }}
                      />

                      <Tooltip 
                        contentStyle={{
                          borderRadius: '12px', 
                          border: darkMode ? '1px solid #374151' : 'none', 
                          backgroundColor: darkMode ? '#111827' : '#fff',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          color: darkMode ? '#f3f4f6' : '#1f2937'
                        }}
                        labelStyle={{ color: darkMode ? '#9ca3af' : '#6b7280' }}
                        labelFormatter={(label) => {
                          const d = new Date(label);
                          return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }}/>
                      
                      <Bar 
                        yAxisId="right" 
                        dataKey="rain" 
                        name="Rainfall (mm)" 
                        fill="#3b82f6" 
                        opacity={0.3} 
                        barSize={8} 
                        radius={[4, 4, 0, 0]} 
                      />
                      <Area 
                        yAxisId="left" 
                        type="monotone" 
                        dataKey="figs" 
                        stroke="#d97706" 
                        strokeWidth={2} 
                        fill="url(#colorFigs)" 
                        name="Ripe Figs" 
                        activeDot={{ r: 6 }} 
                      />
                      <Area 
                        yAxisId="left" 
                        type="monotone" 
                        dataKey="bats" 
                        stroke="#9333ea" 
                        strokeWidth={2} 
                        fill="transparent" 
                        name="Fruit Bats" 
                        activeDot={{ r: 4 }} 
                        strokeDasharray="5 5" 
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* INSIGHT VIEW */}
          {activeTab === TabView.INSIGHT && (
             <AnalysisView 
                analysis={analysis as AnalysisResponse} 
                onGenerate={handleAnalyze} 
                loading={isAnalyzing} 
             />
          )}

          {/* ASK VIEW */}
          {activeTab === TabView.ASK && (
             <AskView data={data} />
          )}

          {/* MENU VIEW (Container for Sub-menus) */}
          {activeTab === TabView.MENU && (
             <div className="fade-in max-w-xl mx-auto space-y-6 pt-8">
                <header className="text-center mb-8">
                   <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Menu</h1>
                   <p className="text-gray-500 dark:text-gray-400">Manage data and settings</p>
                </header>
                
                <div className="grid gap-4">
                  <button 
                    onClick={() => setActiveTab(TabView.ENTRY)}
                    className="p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex items-center gap-4 hover:border-emerald-500 transition-all group"
                  >
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                      <PlusCircle size={28} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg">Log Observation</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Add a new daily record</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setActiveTab(TabView.DATA)}
                    className="p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex items-center gap-4 hover:border-blue-500 transition-all group"
                  >
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                      <TableIcon size={28} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg">View Data Log</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Edit or delete history</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setActiveTab(TabView.SETTINGS)}
                    className="p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex items-center gap-4 hover:border-purple-500 transition-all group"
                  >
                    <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-xl text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                      <Settings size={28} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg">Sync & Settings</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Import/Export CSV data</p>
                    </div>
                  </button>
                </div>
             </div>
          )}

          {/* SUB VIEWS */}
          {activeTab === TabView.ENTRY && (
            <div className="max-w-xl mx-auto space-y-6 fade-in pt-4">
               <button onClick={() => setActiveTab(TabView.MENU)} className="text-sm text-gray-500 hover:text-emerald-600 flex items-center gap-1 mb-2">← Back to Menu</button>
               <header className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Observation</h1>
                <p className="text-gray-500 dark:text-gray-400">Log today's activity</p>
              </header>

              <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Observation Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input 
                    type="date" 
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <SliderInput 
                label="Fruit Bats" 
                value={entryBats} 
                onChange={setEntryBats} 
                colorClass="text-purple-600 dark:text-purple-400"
                icon={<Cat size={24}/>}
              />
              
              <SliderInput 
                label="Ripe Figs" 
                value={entryFigs} 
                onChange={setEntryFigs} 
                colorClass="text-amber-600 dark:text-amber-400"
                icon={<Sprout size={24}/>}
              />

              <SliderInput 
                label="Leaf Coverage" 
                value={entryLeaves} 
                onChange={setEntryLeaves} 
                colorClass="text-emerald-600 dark:text-emerald-400"
                icon={<Leaf size={24}/>}
              />

              <button 
                onClick={handleSaveEntry}
                className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-sm hover:bg-emerald-700 transition-all active:scale-[0.98]"
              >
                Save Entry
              </button>
            </div>
          )}

          {activeTab === TabView.DATA && (
            <div className="space-y-6 fade-in">
               <button onClick={() => setActiveTab(TabView.MENU)} className="text-sm text-gray-500 hover:text-emerald-600 flex items-center gap-1 mb-2">← Back to Menu</button>
               <header className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">History</h1>
                  <p className="text-gray-500 dark:text-gray-400">Full log of observations</p>
                </div>
              </header>

              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-200 text-xs uppercase font-semibold">
                      <tr>
                        <th className="p-4">Date</th>
                        <th className="p-4 text-center">Bats</th>
                        <th className="p-4 text-center">Figs</th>
                        <th className="p-4 text-center">Leaves</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {data.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="p-4 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {row.date.split('-').reverse().join('/')}
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-block px-2 py-1 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-bold w-12">{row.bats}</span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-block px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-bold w-12">{row.figs}</span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-block px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold w-12">{row.leaves}</span>
                          </td>
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => handleDelete(row.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {data.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-gray-400">No data recorded yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === TabView.SETTINGS && (
            <div className="space-y-6 fade-in">
               <button onClick={() => setActiveTab(TabView.MENU)} className="text-sm text-gray-500 hover:text-emerald-600 flex items-center gap-1 mb-2">← Back to Menu</button>
               <header className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings & Sync</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage your data</p>
              </header>

              <DataSync data={data} onDataUpdate={setData} defaultSheetUrl={DEFAULT_SHEET_URL} />
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

// UI Helper Components

const NavButton = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 p-3 w-full rounded-xl transition-all ${
      active 
        ? 'bg-emerald-600 text-white shadow-sm' 
        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-emerald-600 dark:hover:text-emerald-400'
    }`}
  >
    <div className="[&>svg]:w-6 [&>svg]:h-6">{icon}</div>
    <span className="text-xs font-medium">{label}</span>
  </button>
);

const MobileNavButton = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
      active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
    }`}
  >
    <div className={`[&>svg]:w-6 [&>svg]:h-6 ${active ? '[&>svg]:fill-emerald-100 dark:[&>svg]:fill-emerald-900/30' : ''}`}>{icon}</div>
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default App;