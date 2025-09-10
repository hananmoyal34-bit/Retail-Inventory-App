import React, { useState, useEffect, useMemo } from 'react';
import { InventoryLog as InventoryLogType, Location } from '../types';
import { getInventoryLogs, getLocations, formatDateToYMD, formatToLocaleString, getCurrentDateInTimezone } from '../services/dataService';
import LocationTag from './LocationTag';
import DatePicker from './DatePicker';

const TransactionLogs: React.FC = () => {
  const [logs, setLogs] = useState<InventoryLogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentDateInTimezone());
  const [selectedTransactionType, setSelectedTransactionType] = useState<string>('Adjustment-Variance');
  
  const [transactionViewMode, setTransactionViewMode] = useState<'chronological' | 'byProduct'>('byProduct');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());


  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const [logsData, locationsData] = await Promise.all([
          getInventoryLogs(),
          getLocations(),
        ]);
        
        setLogs(logsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setLocations(locationsData);
      } catch (error) {
        console.error("Failed to fetch transaction logs", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const transactionTypes = useMemo(() => {
    if (loading) return ['All'];
    const types = new Set(logs.map(log => log.transactionType));
    return ['All', ...Array.from(types).sort()];
  }, [logs, loading]);
  
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
        if (log.location.toLowerCase() === 'warehouse') {
            return false;
        }
        const locationMatch = selectedLocation === 'All' || log.location === selectedLocation;
        const typeMatch = selectedTransactionType === 'All' || log.transactionType === selectedTransactionType;
        if (!selectedDate) return locationMatch && typeMatch;
        const logDateStr = formatDateToYMD(log.date);
        const dateMatch = logDateStr === selectedDate;
        return locationMatch && dateMatch && typeMatch;
    });
  }, [logs, selectedLocation, selectedDate, selectedTransactionType]);

  const groupedTransactionLogs = useMemo(() => {
    if (transactionViewMode !== 'byProduct') return {};
    return filteredLogs.reduce((acc, log) => {
        if (!acc[log.productName]) {
            acc[log.productName] = [];
        }
        acc[log.productName].push(log);
        return acc;
    }, {} as Record<string, InventoryLogType[]>);
  }, [filteredLogs, transactionViewMode]);

  useEffect(() => {
    if (transactionViewMode === 'byProduct') {
        setExpandedProducts(new Set(Object.keys(groupedTransactionLogs)));
    } else {
        setExpandedProducts(new Set());
    }
  }, [groupedTransactionLogs, transactionViewMode]);

  const clearFilters = () => {
    setSelectedLocation('All');
    setSelectedDate('');
    setSelectedTransactionType('All');
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
              <h2 className="text-3xl font-bold text-gray-900">Inventory Report</h2>
              <p>Loading transaction logs...</p>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Inventory Report</h2>
        <p className="text-gray-600 mt-1">Filter and view all inventory transactions for specific locations and dates.</p>
      </div>
      
       <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
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
            <label htmlFor="transaction-type-filter" className="block text-sm font-medium text-gray-700">Transaction Type</label>
            <select
                id="transaction-type-filter"
                value={selectedTransactionType}
                onChange={(e) => setSelectedTransactionType(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
                {transactionTypes.map(type => (
                <option key={type} value={type}>{type}</option>
                ))}
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
            {renderViewModeToggle(transactionViewMode, setTransactionViewMode)}
            {transactionViewMode === 'chronological' ? (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction Type</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Log ID</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                            <tr key={log.logID} className="odd:bg-white even:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{log.productName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    log.transactionType === 'Stock In' ? 'bg-green-100 text-green-800' :
                                    log.transactionType === 'Initial Stock' ? 'bg-blue-100 text-blue-800' :
                                    log.transactionType === 'In-Store Sale' || log.transactionType === 'Warehouse Shipping' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {log.transactionType}
                                </span>
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${log.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.logID}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatToLocaleString(log.date)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <LocationTag location={log.location} />
                                </td>
                            </tr>
                            )) : (
                            <tr>
                                <td colSpan={6} className="text-center py-10 text-gray-500">No logs match the current filters.</td>
                            </tr>
                            )}
                        </tbody>
                    </table>
                    </div>
                    {/* Mobile Card View */}
                    <div className="md:hidden p-4 space-y-4 bg-gray-50">
                    {filteredLogs.length > 0 ? filteredLogs.map(log => (
                        <div key={log.logID} className="bg-white p-4 rounded-lg shadow-sm border">
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-gray-800 pr-2">{log.productName}</span>
                                <span className={`font-bold text-lg flex-shrink-0 ${log.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm mt-2">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    log.transactionType === 'Stock In' ? 'bg-green-100 text-green-800' :
                                    log.transactionType === 'Initial Stock' ? 'bg-blue-100 text-blue-800' :
                                    log.transactionType === 'In-Store Sale' || log.transactionType === 'Warehouse Shipping' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {log.transactionType}
                                </span>
                                <LocationTag location={log.location} />
                            </div>
                            <div className="text-xs text-gray-500 mt-3 pt-2 border-t">
                                <p>{formatToLocaleString(log.date)}</p>
                                <p>Log ID: {log.logID}</p>
                            </div>
                        </div>
                        )) : (
                            <div className="text-center py-10 text-gray-500 bg-white rounded-lg">
                                <p>No logs match the current filters.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                 <div className="space-y-3">
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => setExpandedProducts(new Set(Object.keys(groupedTransactionLogs)))} className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md">Expand All</button>
                        <button onClick={() => setExpandedProducts(new Set())} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-md">Collapse All</button>
                    </div>
                    {Object.keys(groupedTransactionLogs).length > 0 ? Object.entries(groupedTransactionLogs).map(([productName, logs]) => (
                        <details key={productName} open={expandedProducts.has(productName)} className="bg-white shadow rounded-lg transition-all duration-300 group">
                            <summary className="px-4 py-3 text-lg font-semibold text-gray-800 cursor-pointer list-none flex justify-between items-center hover:bg-gray-50 rounded-t-lg" onClick={(e) => handleToggleProduct(e, productName)}>
                                <span>{productName}</span>
                                <span className="text-gray-600 text-base font-normal">({logs.length} transactions)</span>
                            </summary>
                            <div className="border-t border-gray-200 p-2 md:p-4">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-medium text-gray-500">Date/Time</th>
                                                <th className="px-3 py-2 text-left font-medium text-gray-500">Location</th>
                                                <th className="px-3 py-2 text-left font-medium text-gray-500">Type</th>
                                                <th className="px-3 py-2 text-right font-medium text-gray-500">Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {logs.map(log => (
                                                <tr key={log.logID}>
                                                    <td className="px-3 py-2 whitespace-nowrap">{formatToLocaleString(log.date)}</td>
                                                    <td className="px-3 py-2"><LocationTag location={log.location} /></td>
                                                    <td className="px-3 py-2">{log.transactionType}</td>
                                                    <td className={`px-3 py-2 text-right font-semibold ${log.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>{log.quantity > 0 ? `+${log.quantity}` : log.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </details>
                    )) : (
                        <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow">
                            <p>No logs match the current filters.</p>
                        </div>
                    )}
                 </div>
            )}
      </div>
    </div>
  );
};

export default TransactionLogs;