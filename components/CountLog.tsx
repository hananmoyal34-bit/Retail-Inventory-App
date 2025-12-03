
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CountLog as CountLogType, Location } from '../types';
import { getCountLogs, getLocations, formatDateToYMD, formatToLocaleString } from '../services/dataService';
import LocationTag from './LocationTag';
import DatePicker from './DatePicker';
import { ChevronRightIcon, AdjustmentsIcon } from './icons';

const COLUMN_DEFINITIONS = [
    { key: 'date', label: 'Date/Time' },
    { key: 'location', label: 'Location' },
    { key: 'productName', label: 'Product' },
    { key: 'openingStock', label: 'Opening' },
    { key: 'stockIn', label: 'Stock In' },
    { key: 'inStoreSales', label: 'Sales' },
    { key: 'warehouseShipping', label: 'Shipping' },
    { key: 'calculatedEndCount', label: 'Calculated' },
    { key: 'physicalEndCount', label: 'Physical' },
    { key: 'variance', label: 'Variance' },
];

interface CountLogProps {
    hideHeader?: boolean;
}

const CountLog: React.FC<CountLogProps> = ({ hideHeader = false }) => {
  const [countLogs, setCountLogs] = useState<CountLogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  const [countLogViewMode, setCountLogViewMode] = useState<'chronological' | 'byProduct' | 'byLocation'>('byLocation');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set([
      'date', 'productName', 'physicalEndCount', 'variance', 'openingStock', 'stockIn', 'inStoreSales'
  ]));
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const [countLogsData, locationsData] = await Promise.all([
          getCountLogs(),
          getLocations(),
        ]);
        
        setCountLogs(countLogsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setLocations(locationsData);
      } catch (error) {
        console.error("Failed to fetch count logs", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
            setIsColumnSelectorOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const filteredCountLogs = useMemo(() => {
    return countLogs.filter(log => {
        if (!selectedDate) return true;
        const logDateStr = formatDateToYMD(log.date);
        const dateMatch = logDateStr === selectedDate;
        return dateMatch;
    });
  }, [countLogs, selectedDate]);
  
  const groupedCountLogs = useMemo(() => {
    if (countLogViewMode !== 'byProduct') return {};
    return filteredCountLogs.reduce((acc, log) => {
        if (!acc[log.productName]) {
            acc[log.productName] = [];
        }
        acc[log.productName].push(log);
        return acc;
    }, {} as Record<string, CountLogType[]>);
  }, [filteredCountLogs, countLogViewMode]);

  const groupedByLocationLogs = useMemo(() => {
    if (countLogViewMode !== 'byLocation') return {};
    return filteredCountLogs.reduce((acc, log) => {
        const key = log.location || 'Unknown';
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(log);
        return acc;
    }, {} as Record<string, CountLogType[]>);
  }, [filteredCountLogs, countLogViewMode]);

  const clearFilters = () => {
    setSelectedDate('');
  };
  
  const handleToggleProduct = (e: React.MouseEvent, productName: string) => {
    e.preventDefault();
    setExpandedProducts(prev => {
        const newSet = new Set(prev);
        if (newSet.has(productName)) newSet.delete(productName);
        else newSet.add(productName);
        return newSet;
    });
  };

  const handleToggleLocation = (e: React.MouseEvent, locationName: string) => {
    e.preventDefault();
    setExpandedLocations(prev => {
        const newSet = new Set(prev);
        if (newSet.has(locationName)) newSet.delete(locationName);
        else newSet.add(locationName);
        return newSet;
    });
  };

  const handleColumnToggle = (key: string) => {
      setVisibleColumns(prev => {
          const newSet = new Set(prev);
          if (newSet.has(key)) newSet.delete(key);
          else newSet.add(key);
          return newSet;
      });
  };

  const activeTableColumns = useMemo(() => {
      return COLUMN_DEFINITIONS.filter(col => {
          if (!visibleColumns.has(col.key)) return false;
          // Hide redundant columns based on view mode
          if (countLogViewMode === 'byLocation' && col.key === 'location') return false;
          if (countLogViewMode === 'byProduct' && col.key === 'productName') return false;
          return true;
      });
  }, [visibleColumns, countLogViewMode]);

  const renderCell = (log: CountLogType, key: string) => {
      switch(key) {
          case 'date': return formatToLocaleString(log.date);
          case 'location': return <LocationTag location={log.location} />;
          case 'productName': return <span className="font-medium text-gray-900">{log.productName}</span>;
          case 'stockIn': return <span className="text-green-600">+{log.stockIn}</span>;
          case 'inStoreSales': return <span className="text-red-600">-{log.inStoreSales}</span>;
          case 'warehouseShipping': return <span className="text-green-600">+{log.warehouseShipping}</span>;
          case 'physicalEndCount': return <span className="font-semibold text-indigo-600">{log.physicalEndCount}</span>;
          case 'variance': 
              return <span className={`font-bold ${log.variance === 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {log.variance > 0 ? `+${log.variance}` : log.variance}
              </span>;
          case 'openingStock':
          case 'calculatedEndCount':
              return <span className="text-gray-500">{log[key as keyof CountLogType]}</span>;
          default: return (log as any)[key];
      }
  };

  const renderViewModeToggle = (
    currentMode: 'chronological' | 'byProduct' | 'byLocation',
    setMode: (mode: 'chronological' | 'byProduct' | 'byLocation') => void
  ) => (
    <div className="flex justify-end p-2">
        <div className="inline-flex items-center bg-gray-100 rounded-lg p-1 space-x-1">
            <button
                onClick={() => setMode('chronological')}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${currentMode === 'chronological' ? 'bg-white text-indigo-700 shadow' : 'text-gray-600 hover:text-gray-800'}`}
            >
                Chronological
            </button>
            <button
                onClick={() => setMode('byProduct')}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${currentMode === 'byProduct' ? 'bg-white text-indigo-700 shadow' : 'text-gray-600 hover:text-gray-800'}`}
            >
                Group by Product
            </button>
            <button
                onClick={() => setMode('byLocation')}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${currentMode === 'byLocation' ? 'bg-white text-indigo-700 shadow' : 'text-gray-600 hover:text-gray-800'}`}
            >
                Group by Location
            </button>
        </div>
    </div>
  );

  if (loading) {
      return (
          <div className="space-y-6">
              {!hideHeader && <h2 className="text-3xl font-bold text-gray-900">Count Logs</h2>}
              <p>Loading count logs...</p>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div>
            <h2 className="text-3xl font-bold text-gray-900">Count Logs</h2>
            <p className="text-gray-600 mt-1">A permanent ledger of all daily counts.</p>
        </div>
      )}
      
       <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-col sm:flex-row gap-4 items-end justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-end w-full sm:w-auto">
                <div className="w-full sm:max-w-xs">
                    <DatePicker label="Filter by Date" value={selectedDate} onChange={setSelectedDate} />
                </div>
                <button 
                    onClick={clearFilters}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                    Clear Filters
                </button>
            </div>
            
            <div className="relative" ref={columnSelectorRef}>
                <button 
                    onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <AdjustmentsIcon className="h-5 w-5 text-gray-500" />
                    <span>Columns</span>
                </button>
                {isColumnSelectorOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                        <div className="py-1" role="menu" aria-orientation="vertical">
                            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Visible Columns
                            </div>
                            {COLUMN_DEFINITIONS.map((col) => (
                                <label key={col.key} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={visibleColumns.has(col.key)}
                                        onChange={() => handleColumnToggle(col.key)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3"
                                    />
                                    {col.label}
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
       </div>
      
      <div>
            {renderViewModeToggle(countLogViewMode, setCountLogViewMode)}
            {countLogViewMode === 'chronological' ? (
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {activeTableColumns.map(col => (
                                    <th key={col.key} scope="col" className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${['openingStock', 'stockIn', 'inStoreSales', 'warehouseShipping', 'calculatedEndCount', 'physicalEndCount', 'variance'].includes(col.key) ? 'text-right' : ''}`}>
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredCountLogs.length > 0 ? filteredCountLogs.map((log) => (
                            <tr key={log.logID} className="odd:bg-white even:bg-gray-50">
                                {activeTableColumns.map(col => (
                                    <td key={col.key} className={`px-6 py-4 whitespace-nowrap text-sm ${['openingStock', 'stockIn', 'inStoreSales', 'warehouseShipping', 'calculatedEndCount', 'physicalEndCount', 'variance'].includes(col.key) ? 'text-right' : ''}`}>
                                        {renderCell(log, col.key)}
                                    </td>
                                ))}
                            </tr>
                            )) : (
                            <tr>
                                <td colSpan={activeTableColumns.length} className="text-center py-10 text-gray-500">No count logs match the current filters.</td>
                            </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Mobile Card View */}
                <div className="md:hidden p-4 space-y-4 bg-gray-50">
                {filteredCountLogs.length > 0 ? filteredCountLogs.map(log => (
                    <details key={log.logID} className="bg-white p-4 rounded-lg shadow-sm border group">
                        <summary className="list-none flex justify-between items-center cursor-pointer">
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800">{log.productName}</h3>
                                <p className="text-xs text-gray-500 mt-1">{formatToLocaleString(log.date)}</p>
                            </div>
                            <div className="text-right flex-shrink-0 pl-2">
                                <p className="text-sm font-semibold">Variance: <span className={`font-bold ${log.variance === 0 ? 'text-green-700' : 'text-red-700'}`}>{log.variance > 0 ? `+${log.variance}` : log.variance}</span></p>
                                <p className="text-sm font-semibold">Physical End: <span className="font-bold text-indigo-600">{log.physicalEndCount}</span></p>
                            </div>
                            <ChevronRightIcon className="h-5 w-5 text-gray-500 ml-2 transition-transform group-open:rotate-90" />
                        </summary>
                        <div className="mt-4 pt-4 border-t text-sm space-y-2">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                <span>Opening Stock:</span><span className="font-medium text-right">{log.openingStock}</span>
                                <span>Calculated End:</span><span className="font-medium text-right">{log.calculatedEndCount}</span>
                                <span className="text-green-600">Stock In:</span><span className="font-medium text-right text-green-600">+{log.stockIn}</span>
                                <span className="text-red-600">Sales:</span><span className="font-medium text-right text-red-600">-{log.inStoreSales}</span>
                                <span className="text-green-600">Shipping:</span><span className="font-medium text-right text-green-600">+{log.warehouseShipping}</span>
                            </div>
                            <div className="pt-2 flex justify-end">
                                <LocationTag location={log.location} />
                            </div>
                        </div>
                    </details>
                    )) : (
                        <div className="text-center py-10 text-gray-500 bg-white rounded-lg">
                            <p>No count logs match the current filters.</p>
                        </div>
                    )}
                </div>
            </div>
            ) : countLogViewMode === 'byProduct' ? (
            <div className="space-y-3">
                <div className="flex justify-end space-x-2">
                    <button onClick={() => setExpandedProducts(new Set(Object.keys(groupedCountLogs)))} className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md">Expand All</button>
                    <button onClick={() => setExpandedProducts(new Set())} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-md">Collapse All</button>
                </div>
                {/* FIX: Add explicit type casting for Object.entries to resolve 'unknown' type errors in TypeScript. */}
                {Object.keys(groupedCountLogs).length > 0 ? (Object.entries(groupedCountLogs) as [string, CountLogType[]][]).map(([productName, logs]) => (
                    <details key={productName} open={expandedProducts.has(productName)} className="bg-white shadow rounded-lg transition-all duration-300 group">
                        <summary className="px-4 py-3 text-lg font-semibold text-gray-800 cursor-pointer list-none flex justify-between items-center hover:bg-gray-50 rounded-t-lg" onClick={(e) => handleToggleProduct(e, productName)}>
                            <span>{productName}</span>
                            <span className="text-gray-600 text-base font-normal">({logs.length} counts)</span>
                        </summary>
                        <div className="border-t border-gray-200 p-2 md:p-4">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {activeTableColumns.map(col => (
                                                <th key={col.key} scope="col" className={`px-3 py-2 text-left font-medium text-gray-500 ${['openingStock', 'stockIn', 'inStoreSales', 'warehouseShipping', 'calculatedEndCount', 'physicalEndCount', 'variance'].includes(col.key) ? 'text-right' : ''}`}>
                                                    {col.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {logs.map(log => (
                                            <tr key={log.logID}>
                                                {activeTableColumns.map(col => (
                                                    <td key={col.key} className={`px-3 py-2 ${['openingStock', 'stockIn', 'inStoreSales', 'warehouseShipping', 'calculatedEndCount', 'physicalEndCount', 'variance'].includes(col.key) ? 'text-right' : ''}`}>
                                                        {renderCell(log, col.key)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </details>
                )) : (
                        <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow">
                        <p>No count logs match the current filters.</p>
                    </div>
                )}
            </div>
        ) : (
            <div className="space-y-3">
                <div className="flex justify-end space-x-2">
                    <button onClick={() => setExpandedLocations(new Set(Object.keys(groupedByLocationLogs)))} className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md">Expand All</button>
                    <button onClick={() => setExpandedLocations(new Set())} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-md">Collapse All</button>
                </div>
                {Object.keys(groupedByLocationLogs).length > 0 ? (Object.entries(groupedByLocationLogs) as [string, CountLogType[]][]).map(([locationName, logs]) => (
                    <details key={locationName} open={expandedLocations.has(locationName)} className="bg-white shadow rounded-lg transition-all duration-300 group">
                        <summary className="px-4 py-3 text-lg font-semibold text-gray-800 cursor-pointer list-none flex justify-between items-center hover:bg-gray-50 rounded-t-lg" onClick={(e) => handleToggleLocation(e, locationName)}>
                            <LocationTag location={locationName} />
                            <span className="text-gray-600 text-base font-normal">({logs.length} counts)</span>
                        </summary>
                        <div className="border-t border-gray-200 p-2 md:p-4">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {activeTableColumns.map(col => (
                                                <th key={col.key} scope="col" className={`px-3 py-2 text-left font-medium text-gray-500 ${['openingStock', 'stockIn', 'inStoreSales', 'warehouseShipping', 'calculatedEndCount', 'physicalEndCount', 'variance'].includes(col.key) ? 'text-right' : ''}`}>
                                                    {col.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {logs.map(log => (
                                            <tr key={log.logID}>
                                                {activeTableColumns.map(col => (
                                                    <td key={col.key} className={`px-3 py-2 ${['openingStock', 'stockIn', 'inStoreSales', 'warehouseShipping', 'calculatedEndCount', 'physicalEndCount', 'variance'].includes(col.key) ? 'text-right' : ''}`}>
                                                        {renderCell(log, col.key)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </details>
                )) : (
                        <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow">
                        <p>No count logs match the current filters.</p>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default CountLog;
