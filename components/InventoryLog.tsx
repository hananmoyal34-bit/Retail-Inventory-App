import React, { useState, useEffect, useMemo } from 'react';
import { InventoryLog as InventoryLogType, Location, CountLog } from '../types';
import { getInventoryLogs, getLocations, getCountLogs, formatDateToYMD, formatToLocaleString } from '../services/dataService';
import LocationTag from './LocationTag';
import DatePicker from './DatePicker';
import { ChevronRightIcon } from './icons';

const LOW_STOCK_THRESHOLD = 10;

const InventoryLog: React.FC = () => {
  const [activeTab, setActiveTab] = useState('inventoryByLocation');
  const [logs, setLogs] = useState<InventoryLogType[]>([]);
  const [countLogs, setCountLogs] = useState<CountLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTransactionType, setSelectedTransactionType] = useState<string>('All');
  const [expandedInventoryLocations, setExpandedInventoryLocations] = useState<Set<string>>(new Set());
  const [expandedLowStockLocations, setExpandedLowStockLocations] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAllLogs = async () => {
      setLoading(true);
      try {
        const [logsData, locationsData, countLogsData] = await Promise.all([
          getInventoryLogs(),
          getLocations(),
          getCountLogs(),
        ]);
        
        setLogs(logsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setCountLogs(countLogsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setLocations(locationsData);
      } catch (error) {
        console.error("Failed to fetch inventory logs", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllLogs();
  }, []);

  const transactionTypes = useMemo(() => {
    if (loading) return ['All'];
    const types = new Set(logs.map(log => log.transactionType));
    return ['All', ...Array.from(types).sort()];
  }, [logs, loading]);
  
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
        // FIX: Exclude warehouse transactions from this view entirely.
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

  const filteredCountLogs = useMemo(() => {
    return countLogs.filter(log => {
        const locationMatch = selectedLocation === 'All' || log.location === selectedLocation;
        if (!selectedDate) return locationMatch;
        const logDateStr = formatDateToYMD(log.date);
        const dateMatch = logDateStr === selectedDate;
        return locationMatch && dateMatch;
    });
  }, [countLogs, selectedLocation, selectedDate]);

  const groupedStock = useMemo(() => {
    const latestCounts = new Map<string, { count: number; date: string }>();
    countLogs.forEach(log => {
        const key = `${log.productName}#${log.location}`;
        const logYMD = formatDateToYMD(log.date);
        if (!logYMD) return;

        const existing = latestCounts.get(key);
        if (!existing || logYMD > existing.date) {
            latestCounts.set(key, { count: log.physicalEndCount, date: logYMD });
        }
    });

    const finalStockMap = new Map<string, number>();
    const allProductLocationKeys = new Set([
        ...logs.map(l => `${l.productName}#${l.location}`),
        ...countLogs.map(c => `${c.productName}#${c.location}`)
    ]);

    allProductLocationKeys.forEach(key => {
        const latestCount = latestCounts.get(key);

        if (latestCount) {
            let stock = latestCount.count;
            const subsequentTransactions = logs.filter(log => {
                const logKey = `${log.productName}#${log.location}`;
                if (logKey !== key) return false;
                const logYMD = formatDateToYMD(log.date);
                return logYMD && logYMD > latestCount.date;
            });
            
            subsequentTransactions.forEach(log => {
                stock += log.quantity;
            });

            finalStockMap.set(key, stock);
        } else {
            let stock = 0;
            logs.forEach(log => {
                if (`${log.productName}#${log.location}` === key) {
                    stock += log.quantity;
                }
            });
            finalStockMap.set(key, stock);
        }
    });

    const locationStock: Record<string, { productName: string, stock: number }[]> = {};
    finalStockMap.forEach((stock, key) => {
        const [productName, location] = key.split('#');
        if (!productName || !location || location.toLowerCase() === 'warehouse') return;
        
        if (!locationStock[location]) {
            locationStock[location] = [];
        }
        locationStock[location].push({ productName, stock });
    });

    for (const location in locationStock) {
        locationStock[location].sort((a, b) => a.productName.localeCompare(b.productName));
    }

    return Object.keys(locationStock).sort().reduce(
      (obj, key) => { 
        obj[key] = locationStock[key]; 
        return obj;
      }, 
      {} as Record<string, { productName: string, stock: number }[]>
    );
  }, [logs, countLogs]);

  const lowStockItems = useMemo(() => {
    const itemsByLocation: Record<string, { productName: string; stock: number }[]> = {};
    Object.entries(groupedStock).forEach(([location, products]) => {
        if (selectedLocation !== 'All' && location !== selectedLocation) {
            return;
        }

        const lowItems = products
            .filter(p => p.stock <= LOW_STOCK_THRESHOLD)
            .sort((a,b) => a.stock - b.stock);

        if (lowItems.length > 0) {
            itemsByLocation[location] = lowItems;
        }
    });
    return itemsByLocation;
  }, [groupedStock, selectedLocation]);

  const clearFilters = () => {
    setSelectedLocation('All');
    setSelectedDate('');
    setSelectedTransactionType('All');
  };

  const renderTabButton = (tabName: string, label: string) => {
    const isActive = activeTab === tabName;
    return (
      <button
        onClick={() => setActiveTab(tabName)}
        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
            isActive
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        {label}
      </button>
    );
  };
  
  const handleToggleInventoryLocation = (e: React.MouseEvent, location: string) => {
    e.preventDefault();
    setExpandedInventoryLocations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(location)) {
        newSet.delete(location);
      } else {
        newSet.add(location);
      }
      return newSet;
    });
  };

  const handleToggleLowStockLocation = (e: React.MouseEvent, location: string) => {
    e.preventDefault();
    setExpandedLowStockLocations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(location)) {
        newSet.delete(location);
      } else {
        newSet.add(location);
      }
      return newSet;
    });
  };

  if (loading) {
      return (
          <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">Locations Inventory</h2>
              <p>Loading transaction logs...</p>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Locations Inventory</h2>
        <p className="text-gray-600 mt-1">A permanent ledger of all inventory transactions and daily counts.</p>
      </div>

       <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
              {renderTabButton('inventoryByLocation', 'Inventory')}
              {renderTabButton('lowStock', 'Low Stock')}
              {renderTabButton('counts', 'Count Log')}
              {renderTabButton('transactions', 'Transactions')}
          </nav>
      </div>
      
       {activeTab !== 'inventoryByLocation' && (
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

              {activeTab === 'transactions' && (
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
              )}

              {activeTab !== 'lowStock' && (
                <div>
                  <DatePicker label="Filter by Date" value={selectedDate} onChange={setSelectedDate} />
                </div>
              )}
              
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
        )}
      
      <div>
        {activeTab === 'inventoryByLocation' && (
            <div className="space-y-4">
                <div className="flex justify-end space-x-2 mb-2">
                    <button onClick={() => setExpandedInventoryLocations(new Set(Object.keys(groupedStock)))} className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md">Expand All</button>
                    <button onClick={() => setExpandedInventoryLocations(new Set())} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-md">Collapse All</button>
                </div>
                {Object.keys(groupedStock).length > 0 ? Object.entries(groupedStock).map(([location, products]) => (
                <details key={location} className="bg-white shadow-lg rounded-xl overflow-hidden group transition-all duration-300" open={expandedInventoryLocations.has(location)}>
                    <summary className="px-6 py-4 text-xl font-semibold text-gray-800 cursor-pointer list-none flex justify-between items-center hover:bg-gray-50 transition-colors" onClick={(e) => handleToggleInventoryLocation(e, location)}>
                    <div className="flex items-center gap-4">
                        <LocationTag location={location} />
                        <span className="text-gray-500 text-base font-normal">({products.length} products)</span>
                    </div>
                    <span className="text-indigo-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform transition-transform duration-200 group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </span>
                    </summary>
                    <div className="border-t border-gray-200 divide-y divide-gray-100">
                        {products.map((item) => {
                            const stockLevelClasses = 
                                item.stock <= 0 
                                ? 'bg-red-100 text-red-800'
                                : item.stock <= LOW_STOCK_THRESHOLD 
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800';

                            return (
                                <div key={item.productName} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50/50">
                                    <p className="text-base font-medium text-gray-800 pr-4">{item.productName}</p>
                                    <span className={`px-4 py-1.5 min-w-[60px] text-center text-lg font-bold rounded-full ${stockLevelClasses}`}>
                                        {item.stock}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </details>
                )) : (
                    <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow">
                        <p className="text-lg">No stock data available.</p>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'lowStock' && (
            <div className="space-y-4">
                <div className="flex justify-end space-x-2 mb-2">
                    <button onClick={() => setExpandedLowStockLocations(new Set(Object.keys(lowStockItems)))} className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md">Expand All</button>
                    <button onClick={() => setExpandedLowStockLocations(new Set())} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-md">Collapse All</button>
                </div>
                {Object.keys(lowStockItems).length > 0 ? Object.entries(lowStockItems).map(([location, items]) => (
                    <details key={location} className="bg-white shadow-lg rounded-xl overflow-hidden group transition-all duration-300" open={expandedLowStockLocations.has(location)}>
                        <summary className="px-6 py-4 text-xl font-semibold text-gray-800 cursor-pointer list-none flex justify-between items-center hover:bg-gray-50 transition-colors" onClick={(e) => handleToggleLowStockLocation(e, location)}>
                        <div className="flex items-center gap-4">
                            <LocationTag location={location} />
                            <span className="text-gray-500 text-base font-normal">({items.length} items)</span>
                        </div>
                        <span className="text-indigo-600">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform transition-transform duration-200 group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </span>
                        </summary>
                        <div className="border-t border-gray-200 divide-y divide-gray-100">
                            {items.map(item => (
                                <div key={item.productName} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50/50">
                                    <p className="text-base font-medium text-gray-800 pr-4">{item.productName}</p>
                                    <span className="px-3 py-1 text-sm font-bold rounded-full bg-red-100 text-red-800">{item.stock}</span>
                                </div>
                            ))}
                        </div>
                    </details>
                )) : (
                    <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow">
                        <p className="text-lg">No location items are low on stock.</p>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'transactions' && (
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
        )}
        
        {activeTab === 'counts' && (
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
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Shipping</th>
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">-{log.warehouseShipping}</td>
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
                                <span className="text-red-600">Shipping:</span><span className="font-medium text-right text-red-600">-{log.warehouseShipping}</span>
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
        )}
      </div>
    </div>
  );
};

export default InventoryLog;