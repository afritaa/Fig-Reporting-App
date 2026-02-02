import React, { useState, useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { AnalysisResponse } from '../types';
import { Sparkles, ArrowRight } from 'lucide-react';

interface AnalysisViewProps {
  analysis: AnalysisResponse;
  onGenerate: () => void;
  loading: boolean;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ analysis, onGenerate, loading }) => {
  const currentYear = new Date().getFullYear();
  const [forecastYear, setForecastYear] = useState<number>(currentYear);

  // Format chart data based on selected year
  const chartData = useMemo(() => {
    if (!analysis) return [];
    
    // Filter points for the selected year
    return analysis.predictionPoints
      .filter(p => new Date(p.date).getFullYear() === forecastYear)
      .map(p => ({
        ...p,
        dateNum: new Date(p.date).getTime()
      }));
  }, [analysis, forecastYear]);

  // Fixed domain for the selected year to ensure Jan-Dec view
  const chartDomain = [
    new Date(forecastYear, 0, 1).getTime(),
    new Date(forecastYear, 11, 31).getTime()
  ];

  const chartTicks = useMemo(() => {
    const ticks = [];
    for (let i = 0; i < 12; i++) {
        ticks.push(new Date(forecastYear, i, 1).getTime());
    }
    return ticks;
  }, [forecastYear]);

  if (!analysis) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 fade-in">
             <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-full mb-4">
                 <Sparkles size={64} className="text-gray-400 dark:text-gray-600" />
             </div>
             <h2 className="text-2xl font-bold text-gray-900 dark:text-white">No Analysis Generated</h2>
             <p className="text-gray-500 dark:text-gray-400 max-w-md">
                 Generate an analysis from the Dashboard to view detailed predictions and ecological reports here.
             </p>
             <button
                onClick={onGenerate}
                disabled={loading}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition-all flex items-center gap-2"
              >
                {loading ? 'Generating...' : 'Go to Dashboard & Generate'}
              </button>
        </div>
      )
  }

  return (
    <div className="space-y-6 fade-in pb-12">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Detailed Insights</h1>
        <p className="text-gray-500 dark:text-gray-400">Deep dive into ecological predictions and patterns</p>
      </header>

      {/* Predictive Graph Section */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Fig Probability Forecast</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Predicted fruiting event probability (%)</p>
            </div>
            
            {/* Year Selector */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button 
                  onClick={() => setForecastYear(currentYear)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                    forecastYear === currentYear 
                    ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-emerald-600'
                  }`}
                >
                  {currentYear}
                </button>
                <button 
                  onClick={() => setForecastYear(currentYear + 1)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                    forecastYear === currentYear + 1 
                    ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-emerald-600'
                  }`}
                >
                  {currentYear + 1}
                </button>
            </div>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFigsPred" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.3} />
                <XAxis 
                  dataKey="dateNum" 
                  type="number"
                  domain={chartDomain as any}
                  ticks={chartTicks}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return d.toLocaleDateString('en-AU', { month: 'short' });
                  }}
                  tick={{fontSize: 10, fill: '#94a3b8'}}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{fontSize: 11, fill: '#94a3b8'}} 
                  axisLine={false} 
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip 
                  contentStyle={{
                    borderRadius: '12px', 
                    border: 'none', 
                    backgroundColor: '#1f2937',
                    color: '#f3f4f6',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  labelFormatter={(label) => {
                      const d = new Date(label);
                      return d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
                  }}
                  formatter={(value: number) => [`${value}%`, 'Probability']}
                />
                <Area 
                  type="monotone" 
                  dataKey="figs" 
                  stroke="#059669" 
                  strokeWidth={2} 
                  fill="url(#colorFigsPred)" 
                  name="Fruiting Probability" 
                  activeDot={{ r: 6 }} 
                  strokeDasharray="5 5" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
      </div>

      {/* Deep Dive Report Section */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors duration-300">
        <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Deep Dive Analysis</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Correlation with seasonal trends & predictions</p>
        </div>
        
        <div className="p-6 md:p-8 prose prose-emerald max-w-none dark:prose-invert">
            {/* Manual Markdown Rendering */}
            {analysis.detailedReport.split('\n').map((line, i) => {
              if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold mt-6 mb-3 text-gray-900 dark:text-gray-100">{line.replace('### ', '')}</h3>;
              if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mt-8 mb-4 text-gray-950 dark:text-white pb-2 border-b border-gray-100 dark:border-gray-800">{line.replace('## ', '')}</h2>;
              if (line.startsWith('**') && line.endsWith('**')) return <strong key={i} className="block mt-4 mb-2 text-gray-900 dark:text-gray-100">{line.replace(/\*\*/g, '')}</strong>;
              if (line.trim().startsWith('- ')) {
                return (
                    <div key={i} className="flex gap-2 mb-2 ml-2">
                        <span className="text-emerald-500 mt-1.5">•</span>
                        <span className="text-gray-600 dark:text-gray-300 leading-relaxed">{line.replace('- ', '')}</span>
                    </div>
                );
              }
              if (/^\d+\./.test(line.trim())) {
                return (
                    <div key={i} className="flex gap-2 mb-2 ml-2">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm mt-0.5">{line.split('.')[0]}.</span>
                          <span className="text-gray-600 dark:text-gray-300 leading-relaxed">{line.substring(line.indexOf('.') + 1)}</span>
                    </div>
                )
              }
              if (line.trim() === '') return <div key={i} className="h-2"></div>;
              return <p key={i} className="mb-3 text-gray-600 dark:text-gray-300 leading-relaxed">{line}</p>;
            })}
        </div>
      </div>
    </div>
  );
};

export default AnalysisView;