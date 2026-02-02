import React, { useState } from 'react';
import { Copy, Download, Upload, Check, FileSpreadsheet, Link as LinkIcon, AlertCircle, RefreshCcw } from 'lucide-react';
import { Observation } from '../types';
import { exportToCSV, importFromCSV, fetchGoogleSheet } from '../services/storageService';

interface DataSyncProps {
  data: Observation[];
  onDataUpdate: (newData: Observation[]) => void;
  defaultSheetUrl?: string;
}

const DataSync: React.FC<DataSyncProps> = ({ data, onDataUpdate, defaultSheetUrl }) => {
  const [csvInput, setCsvInput] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleCopy = () => {
    const csv = exportToCSV(data);
    navigator.clipboard.writeText(csv);
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const handlePasteImport = () => {
    if (!csvInput.trim()) return;
    try {
      const newData = importFromCSV(csvInput);
      if (newData.length > 0) {
        onDataUpdate(newData);
        setCsvInput('');
        setImportStatus('success');
        setTimeout(() => setImportStatus('idle'), 3000);
      } else {
        setImportStatus('error');
        setErrorMessage("Could not parse data. Ensure date format is DD/MM/YYYY or DDMMYYYY.");
      }
    } catch (e) {
      setImportStatus('error');
      setErrorMessage("An unexpected error occurred during parsing.");
    }
  };

  const handleUrlImport = async (urlOverride?: string) => {
    const urlToUse = urlOverride || sheetUrl;
    if (!urlToUse.trim()) return;
    
    setImportStatus('loading');
    setErrorMessage('');
    
    try {
      const newData = await fetchGoogleSheet(urlToUse);
      if (newData.length > 0) {
        onDataUpdate(newData);
        setSheetUrl('');
        setImportStatus('success');
        setTimeout(() => setImportStatus('idle'), 3000);
      } else {
        setImportStatus('error');
        setErrorMessage("Connected to sheet, but found no valid data starting from Row 5.");
      }
    } catch (e: any) {
      setImportStatus('error');
      setErrorMessage(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-lg text-green-700 dark:text-green-400">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Sync with Google Sheets</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Import your data via URL or Copy/Paste.</p>
          </div>
        </div>

        {/* Status Messages */}
        {importStatus === 'success' && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg flex items-center gap-2 text-sm border border-green-100 dark:border-green-900/30">
            <Check size={16} /> Data successfully updated!
          </div>
        )}
        {importStatus === 'error' && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg flex items-start gap-2 text-sm border border-red-100 dark:border-red-900/30">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> 
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-8">
          
          {/* Option 0: Quick Load Default */}
          {defaultSheetUrl && (
             <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/20 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-emerald-900 dark:text-emerald-300 text-sm">Reset to Woombye Public Data</h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-500 opacity-80">Reload the standard dataset.</p>
                </div>
                <button 
                  onClick={() => handleUrlImport(defaultSheetUrl)}
                  disabled={importStatus === 'loading'}
                  className="px-3 py-2 bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-50 dark:hover:bg-gray-700 transition-colors shadow-sm flex items-center gap-2"
                >
                  <RefreshCcw size={14} className={importStatus === 'loading' ? 'animate-spin' : ''}/>
                  {importStatus === 'loading' ? 'Loading...' : 'Load Data'}
                </button>
             </div>
          )}
          
          {/* Option 1: URL Import */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
              <LinkIcon size={16} /> Import via Link
            </h4>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 space-y-1">
              <p>Paste the full URL of your Google Sheet.</p>
              <p className="italic text-emerald-600 dark:text-emerald-400">Note: Data must start at Row 5. <br/> Column A = Date, B = Figs, C = Bats.</p>
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1 p-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
              />
              <button 
                onClick={() => handleUrlImport()}
                disabled={importStatus === 'loading'}
                className={`px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                  importStatus === 'loading' ? 'opacity-70 cursor-wait' : 'hover:bg-emerald-700'
                }`}
              >
                {importStatus === 'loading' ? 'Fetching...' : 'Fetch Data'}
              </button>
            </div>
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 dark:text-gray-500 text-xs uppercase font-medium">Or manually</span>
            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Option 2: Paste Import */}
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Paste Data</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Copy columns A-C (Date, Figs, Bats) starting from Row 5.
              </p>
              <textarea 
                className="w-full h-32 p-3 text-xs font-mono bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-gray-900 dark:text-gray-200"
                placeholder={`01/10/2023\t20\t10\n02/10/2023\t25\t15`}
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
              />
              <button 
                onClick={handlePasteImport}
                className="w-full py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
              >
                <Upload size={14} /> Parse & Import
              </button>
            </div>

            {/* Option 3: Export */}
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Backup Data</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Export current app data to CSV format.
              </p>
              <div className="relative">
                <textarea 
                  readOnly 
                  className="w-full h-32 p-3 text-xs font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-gray-600 dark:text-gray-400"
                  value={exportToCSV(data)}
                />
                <button 
                  onClick={handleCopy}
                  className="absolute top-2 right-2 p-1.5 bg-white dark:bg-gray-700 rounded-md shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-emerald-600 dark:text-emerald-400 transition-colors"
                  title="Copy to clipboard"
                >
                  {copyStatus === 'copied' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DataSync;