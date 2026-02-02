import React from 'react';

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  colorClass: string;
  icon: React.ReactNode;
}

const SliderInput: React.FC<SliderInputProps> = ({ label, value, onChange, colorClass, icon }) => {
  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mb-4 transition-colors duration-300">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg bg-gray-50 dark:bg-gray-800 ${colorClass}`}>
            {icon}
          </div>
          <span className="font-semibold text-gray-700 dark:text-gray-200">{label}</span>
        </div>
        <span className="text-2xl font-bold text-gray-800 dark:text-white">{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
      />
      <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium">
        <span>0% (None)</span>
        <span>100% (Max Impact)</span>
      </div>
    </div>
  );
};

export default SliderInput;