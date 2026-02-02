import React from 'react';
import { Activity, CalendarClock, CloudRain } from 'lucide-react';
import { AnalysisResponse } from '../types';

interface AnalysisSnapshotProps {
  analysis: AnalysisResponse;
}

const AnalysisSnapshot: React.FC<AnalysisSnapshotProps> = ({ analysis }) => {
  return (
    <div className="bg-emerald-900 dark:bg-black rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden fade-in">
      <div className="absolute top-0 right-0 p-32 bg-emerald-500 opacity-10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
      
      <div className="relative z-10">
        <span className="inline-block px-3 py-1 bg-emerald-500/20 backdrop-blur-sm rounded-full text-xs font-bold tracking-wider uppercase mb-4 border border-emerald-500/30 text-emerald-100">
          Snapshot
        </span>
        <h2 className="text-2xl md:text-3xl font-bold mb-6 leading-tight text-white">
          {analysis.headline}
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
            <div className="flex items-center gap-2 text-emerald-300 mb-2 text-sm font-medium uppercase">
              <Activity size={16} /> Current Phase
            </div>
            <div className="text-xl font-bold text-white">{analysis.currentPhase}</div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
             <div className="flex items-center gap-2 text-emerald-300 mb-2 text-sm font-medium uppercase">
              <CalendarClock size={16} /> Forecast
            </div>
            <div className="text-xl font-bold text-white">{analysis.nextEvent}</div>
          </div>

           <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
             <div className="flex items-center gap-2 text-emerald-300 mb-2 text-sm font-medium uppercase">
              <CloudRain size={16} /> Environment
            </div>
            <div className="text-sm font-medium leading-relaxed opacity-90 text-white">{analysis.environmentalContext}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisSnapshot;