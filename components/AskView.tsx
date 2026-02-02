import React, { useState } from 'react';
import { MessageCircle, RefreshCw, Send, Sparkles } from 'lucide-react';
import { Observation } from '../types';
import { askSpecificQuestion } from '../services/geminiService';

interface AskViewProps {
  data: Observation[];
}

const AskView: React.FC<AskViewProps> = ({ data }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const handleAskQuestion = async () => {
    if (!question.trim()) return;
    setAsking(true);
    setAnswer(null);
    const result = await askSpecificQuestion(data, question);
    setAnswer(result);
    setAsking(false);
  };

  return (
    <div className="max-w-3xl mx-auto fade-in space-y-6">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-full text-emerald-600 dark:text-emerald-400">
                <MessageCircle size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ask Ecologist AI</h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed">
           Have a specific question about your data? Ask about correlations, specific dates, or patterns.
        </p>
      </header>

      <div className="bg-gradient-to-br from-white to-emerald-50/30 dark:from-gray-900 dark:to-gray-800 rounded-3xl p-6 md:p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
         <div className="flex gap-3 mb-8 relative">
            <input 
              type="text" 
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
              placeholder="e.g. Do bats appear more when it rains? or What happened in November?"
              className="flex-1 p-4 pr-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-800 dark:text-white focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 focus:border-emerald-500 outline-none transition-all shadow-sm"
            />
            <button 
              onClick={handleAskQuestion}
              disabled={asking || !question.trim()}
              className="absolute right-2 top-2 bottom-2 aspect-square bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-xl transition-all flex items-center justify-center shadow-md"
            >
              {asking ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} />}
            </button>
         </div>

         {answer ? (
           <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl border border-emerald-100 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-2 shadow-sm relative">
              <div className="absolute -top-3 left-6 bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                 <Sparkles size={10} /> AI Answer
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">{answer}</p>
           </div>
         ) : (
            <div className="text-center py-12 opacity-40">
                <Sparkles size={48} className="mx-auto mb-4 text-emerald-900 dark:text-emerald-100"/>
                <p className="text-sm font-medium text-gray-500">AI is ready to analyze your specific queries</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default AskView;