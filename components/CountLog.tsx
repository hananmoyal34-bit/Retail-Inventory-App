import React, { useState, useEffect, useMemo } from 'react';
import { CountLog as CountLogType, Location } from '../types';
import { getCountLogs, getLocations, formatDateToYMD, formatToLocaleString } from '../services/dataService';
import LocationTag from './LocationTag';
import DatePicker from './DatePicker';
import { ChevronRightIcon } from './icons';

const CountLog: React.FC = () => {
  const [countLogs, setCountLogs] = useState<CountLogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  const [countLogViewMode, setCountLogViewMode] = useState<'chronological' | 'byProduct'>('chronological');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());


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
  
  const filteredCountLogs = useMemo(() => {
    return countLogs.filter(log => {
        const locationMatch = selectedLocation === 'All' || log.location === selectedLocation;
        if (!selectedDate) return locationMatch;
        const logDateStr = formatDateToYMD(log.date);
        const dateMatch = logDateStr === selectedDate;
        return locationMatch && dateMatch;
    });
  }, [countLogs, selectedLocation, selectedDate]);
  
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

  const clearFilters = () => {
    setSelectedLocation('All');
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

  const renderViewModeToggle = (
    currentMode: 'chronological' | 'byProduct',
    setMode: (mode: 'chronological' | 'byProduct') => void
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
        </div>
    </div>
  );

  if (loading) {
      return (
          <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">Count Logs</h2>
              <p>Loading count logs...</p>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Count Logs</h2>
        <p className="text-gray-600 mt-1">A permanent ledger of all daily counts.</p>
      </div>
      
       <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
            <label htmlFor="location-filter" className="block text-sm font-medium text-gray-700">Location</label>
            <select
                id="location-filter"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
                <option value="All">All Locations</option>
                {locations.map(loc => <option key={loc.id} value={loc.name}>{loc.name}</option>)}
            </select>
            </div>
            <div>
                <DatePicker label="Filter by Date" value={selectedDate} onChange={setSelectedDate} />
            </div>
            <div>
            <button 
                onClick={clearFilters}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
                Clear Filters
            </button>
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
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Opening</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock In</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Shipping (+)</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Calculated</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Physical</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredCountLogs.length > 0 ? filteredCountLogs.map((log) => (
                            <tr key={log.logID} className="odd:bg-white even:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.productName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{log.openingStock}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">+{log.stockIn}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">-{log.inStoreSales}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">+{log.warehouseShipping}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold text-right">{log.calculatedEndCount}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold text-right">{log.physicalEndCount}</td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${log.variance === 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {log.variance > 0 ? `+${log.variance}` : log.variance}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatToLocaleString(log.date)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <LocationTag location={log.location} />
                                </td>
                            </tr>
                            )) : (
                            <tr>
                                <td colSpan={10} className="text-center py-10 text-gray-500">No count logs match the current filters.</td>
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
            ) : (
            <div className="space-y-3">
                <div className="flex justify-end space-x-2">
                    <button onClick={() => setExpandedProducts(new Set(Object.keys(groupedCountLogs)))} className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md">Expand All</button>
                    <button onClick={() => setExpandedProducts(new Set())} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-md">Collapse All</button>
                </div>
                {Object.keys(groupedCountLogs).length > 0 ? Object.entries(groupedCountLogs).map(([productName, logs]) => (
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
                                            <th className="px-3 py-2 text-left font-medium text-gray-500">Date/Time</th>
                                            <th className="px-3 py-2 text-left font-medium text-gray-500">Location</th>
                                            <th className="px-3 py-2 text-right font-medium text-gray-500">Physical</th>
                                            <th className="px-3 py-2 text-right font-medium text-gray-500">Variance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {logs.map(log => (
                                            <tr key={log.logID}>
                                                <td className="px-3 py-2 whitespace-nowrap">{formatToLocaleString(log.date)}</td>
                                                <td className="px-3 py-2"><LocationTag location={log.location} /></td>
                                                <td className="px-3 py-2 text-right font-semibold text-indigo-600">{log.physicalEndCount}</td>
                                                <td className={`px-3 py-2 text-right font-bold ${log.variance === 0 ? 'text-green-700' : 'text-red-700'}`}>{log.variance > 0 ? `+${log.variance}` : log.variance}</td>
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