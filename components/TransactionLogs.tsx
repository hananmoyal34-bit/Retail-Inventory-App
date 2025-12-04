
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { InventoryLog as InventoryLogType } from '../types';
import { getInventoryLogs, formatDateToYMD, formatToLocaleString, getCurrentDateInTimezone } from '../services/dataService';
import LocationTag from './LocationTag';
import DatePicker from './DatePicker';
import { ChevronRightIcon, AdjustmentsIcon } from './icons';
import CountLogView from './CountLog';

const COLUMN_DEFINITIONS = [
    { key: 'date', label: 'Date/Time' },
    { key: 'productName', label: 'Product Name' },
    { key: 'transactionType', label: 'Transaction Type' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'logID', label: 'Log ID' },
    { key: 'location', label: 'Location' },
];

const TransactionLogs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'countLogs'>('transactions');
  const [logs, setLogs] = useState<InventoryLogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentDateInTimezone());
  const [selectedTransactionType, setSelectedTransactionType] = useState<string>('Adjustment-Variance');
  
  const [transactionViewMode, setTransactionViewMode] = useState<'chronological' | 'byProduct' | 'byLocation'>('byLocation');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    try {
      const savedColumns = localStorage.getItem('inventoryReportVisibleColumns_v2');
      if (savedColumns) {
        return new Set(JSON.parse(savedColumns));
      }
    } catch (error) {
      console.error("Failed to load visible columns from local storage", error);
    }
    // Default columns: Product Name, Quantity, Location. Exclude Date/Time, Type, Log ID.
    return new Set(['productName', 'quantity', 'location']);
  });

  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const logsData = await getInventoryLogs();
        setLogs(logsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } catch (error) {
        console.error("Failed to fetch transaction logs", error);
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

  // Save visible columns to local storage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('inventoryReportVisibleColumns_v2', JSON.stringify(Array.from(visibleColumns)));
    } catch (error) {
      console.error("Failed to save visible columns to local storage", error);
    }
  }, [visibleColumns]);

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
        const typeMatch = selectedTransactionType === 'All' || log.transactionType === selectedTransactionType;
        if (!selectedDate) return typeMatch;
        const logDateStr = formatDateToYMD(log.date);
        const dateMatch = logDateStr === selectedDate;
        return dateMatch && typeMatch;
    });
  }, [logs, selectedDate, selectedTransactionType]);

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

  const groupedByLocationLogs = useMemo(() => {
    if (transactionViewMode !== 'byLocation') return {};
    return filteredLogs.reduce((acc, log) => {
        const key = log.location || 'Unknown';
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(log);
        return acc;
    }, {} as Record<string, InventoryLogType[]>);
  }, [filteredLogs, transactionViewMode]);

  useEffect(() => {
    if (transactionViewMode === 'byProduct') {
        setExpandedProducts(new Set(Object.keys(groupedTransactionLogs)));
    } else if (transactionViewMode === 'byLocation') {
        setExpandedLocations(new Set(Object.keys(groupedByLocationLogs)));
    }
  }, [groupedTransactionLogs, groupedByLocationLogs, transactionViewMode]);

  const clearFilters = () => {
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
        if (transactionViewMode === 'byLocation' && col.key === 'location') return false;
        if (transactionViewMode === 'byProduct' && col.key === 'productName') return false;
        return true;
    });
  }, [visibleColumns, transactionViewMode]);

  const renderCell = (log: InventoryLogType, key: string) => {
    switch (key) {
        case 'productName': return <span className="text-gray-700">{log.productName}</span>;
        case 'transactionType':
            return (
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  log.transactionType === 'Stock In' ? 'bg-green-100 text-green-800' :
                  log.transactionType === 'Initial Stock' ? 'bg-blue-100 text-blue-800' :
                  log.transactionType === 'In-Store Sale' || log.transactionType === 'Warehouse Shipping' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
              }`}>
                  {log.transactionType}
              </span>
            );
        case 'quantity':
            return (
              <span className={`font-semibold ${log.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
              </span>
            );
        case 'logID': return <span className="text-gray-900 font-medium">{log.logID}</span>;
        case 'date': return <span className="text-gray-700">{formatToLocaleString(log.date)}</span>;
        case 'location': return <LocationTag location={log.location} />;
        default: return null;
    }
  };

  const renderMobileCard = (log: InventoryLogType) => {
    // Determine which fields are prominent
    const hasName = activeTableColumns.some(c => c.key === 'productName');
    const hasQty = activeTableColumns.some(c => c.key === 'quantity');
    const restColumns = activeTableColumns.filter(c => c.key !== 'productName' && c.key !== 'quantity');

    return (
        <div key={log.logID} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            {(hasName || hasQty) && (
                <div className="flex justify-between items-start mb-2 pb-2 border-b border-gray-100">
                    {hasName && <div className="font-bold text-gray-900 break-words pr-2">{log.productName}</div>}
                    {hasQty && <div className="text-lg font-bold flex-shrink-0">{renderCell(log, 'quantity')}</div>}
                </div>
            )}
            <div className="space-y-1.5">
                {restColumns.map(col => (
                    <div key={col.key} className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">{col.label}</span>
                        <div className="text-right">{renderCell(log, col.key)}</div>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  const renderViewModeToggle = (
    currentMode: 'chronological' | 'byProduct' | 'byLocation',
    setMode: (mode: 'chronological' | 'byProduct' | 'byLocation') => void
  ) => (
    <div className="flex justify-end p-2">
        <div className="inline-flex items-center bg-gray-100 rounded-lg p-1 space-x-1">
            <button
                onClick={() => setMode('byLocation')}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${currentMode === 'byLocation' ? 'bg-white text-indigo-700 shadow' : 'text-gray-600 hover:text-gray-800'}`}
            >
                Group by Location
            </button>
            <button
                onClick={() => setMode('byProduct')}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${currentMode === 'byProduct' ? 'bg-white text-indigo-700 shadow' : 'text-gray-600 hover:text-gray-800'}`}
            >
                Group by Product
            </button>
            <button
                onClick={() => setMode('chronological')}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${currentMode === 'chronological' ? 'bg-white text-indigo-700 shadow' : 'text-gray-600 hover:text-gray-800'}`}
            >
                Chronological
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
        <p className="text-gray-600 mt-1">View inventory transaction history and count logs.</p>
      </div>

      <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                  onClick={() => setActiveTab('transactions')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'transactions'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                  Transactions
              </button>
              <button
                  onClick={() => setActiveTab('countLogs')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'countLogs'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                  Count Logs
              </button>
          </nav>
      </div>
      
      {activeTab === 'transactions' ? (
        <>
            <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex flex-col sm:flex-row gap-4 items-end justify-between">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end w-full">
                    <div>
                        <DatePicker label="Filter by Date" value={selectedDate} onChange={setSelectedDate} />
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
                        <button 
                            onClick={clearFilters}
                            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>

                <div className="relative flex-shrink-0" ref={columnSelectorRef}>
                    <button 
                        onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
                        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <AdjustmentsIcon className="h-5 w-5 text-gray-500" />
                        <span>Columns</span>
                    </button>
                    {isColumnSelectorOpen && (
                        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
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
                {renderViewModeToggle(transactionViewMode, setTransactionViewMode)}
                {transactionViewMode === 'chronological' ? (
                    <div className="bg-white shadow-md rounded-lg overflow-hidden">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {activeTableColumns.map(col => (
                                        <th key={col.key} scope="col" className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.key === 'quantity' ? 'text-right' : ''}`}>
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                                <tr key={log.logID} className="odd:bg-white even:bg-gray-50">
                                    {activeTableColumns.map(col => (
                                        <td key={col.key} className={`px-6 py-4 whitespace-nowrap text-sm ${col.key === 'quantity' ? 'text-right' : ''}`}>
                                            {renderCell(log, col.key)}
                                        </td>
                                    ))}
                                </tr>
                                )) : (
                                <tr>
                                    <td colSpan={activeTableColumns.length} className="text-center py-10 text-gray-500">No logs match the current filters.</td>
                                </tr>
                                )}
                            </tbody>
                        </table>
                        </div>
                        {/* Mobile Card View */}
                        <div className="md:hidden p-4 space-y-4 bg-gray-50">
                        {filteredLogs.length > 0 ? filteredLogs.map(log => renderMobileCard(log)) : (
                                <div className="text-center py-10 text-gray-500 bg-white rounded-lg">
                                    <p>No logs match the current filters.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : transactionViewMode === 'byProduct' ? (
                        <div className="space-y-3">
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => setExpandedProducts(new Set(Object.keys(groupedTransactionLogs)))} className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md">Expand All</button>
                            <button onClick={() => setExpandedProducts(new Set())} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-md">Collapse All</button>
                        </div>
                        {Object.keys(groupedTransactionLogs).length > 0 ? (Object.entries(groupedTransactionLogs) as [string, InventoryLogType[]][]).map(([productName, logs]) => (
                            <details key={productName} open={expandedProducts.has(productName)} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-4 group">
                                <summary className="px-5 py-4 cursor-pointer list-none flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors" onClick={(e) => handleToggleProduct(e, productName)}>
                                    <div className="flex flex-1 items-center justify-between gap-3">
                                        <div className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                             <div className="w-1 h-6 bg-indigo-500 rounded-full mr-1"></div>
                                             {productName}
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="bg-white border border-gray-200 text-gray-600 py-1 px-3 rounded-full text-xs font-bold shadow-sm">{logs.length}</span>
                                            <ChevronRightIcon className="h-5 w-5 text-gray-400 transform transition-transform duration-200 group-open:rotate-90" />
                                        </div>
                                    </div>
                                </summary>
                                <div className="border-t border-gray-200 p-3 md:p-4 bg-gray-50/50">
                                    {/* Desktop Table */}
                                    <div className="hidden md:block overflow-x-auto bg-white rounded-lg border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    {activeTableColumns.map(col => (
                                                        <th key={col.key} scope="col" className={`px-3 py-2 text-left font-medium text-gray-500 ${col.key === 'quantity' ? 'text-right' : ''}`}>
                                                            {col.label}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {logs.map(log => (
                                                    <tr key={log.logID}>
                                                        {activeTableColumns.map(col => (
                                                            <td key={col.key} className={`px-3 py-2 ${col.key === 'quantity' ? 'text-right' : ''}`}>
                                                                {renderCell(log, col.key)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* Mobile Card View for Product Groups */}
                                    <div className="md:hidden space-y-3">
                                        {logs.map(log => renderMobileCard(log))}
                                    </div>
                                </div>
                            </details>
                        )) : (
                            <div className="text-center py-10 text-gray-500 bg-white/50 rounded-lg shadow">
                                <p>No logs match the current filters.</p>
                            </div>
                        )}
                        </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => setExpandedLocations(new Set(Object.keys(groupedByLocationLogs)))} className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md">Expand All</button>
                            <button onClick={() => setExpandedLocations(new Set())} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-md">Collapse All</button>
                        </div>
                        {Object.keys(groupedByLocationLogs).length > 0 ? (Object.entries(groupedByLocationLogs) as [string, InventoryLogType[]][]).map(([locationName, logs]) => (
                            <details key={locationName} open={expandedLocations.has(locationName)} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-4 group">
                                <summary className="px-5 py-4 cursor-pointer list-none flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors" onClick={(e) => handleToggleLocation(e, locationName)}>
                                    <div className="flex flex-1 items-center justify-between gap-3">
                                        <div className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                             <div className="w-1 h-6 bg-indigo-500 rounded-full mr-1"></div>
                                             {locationName}
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="bg-white border border-gray-200 text-gray-600 py-1 px-3 rounded-full text-xs font-bold shadow-sm">{logs.length}</span>
                                            <ChevronRightIcon className="h-5 w-5 text-gray-400 transform transition-transform duration-200 group-open:rotate-90" />
                                        </div>
                                    </div>
                                </summary>
                                <div className="border-t border-gray-200 p-3 md:p-4 bg-gray-50/50">
                                    {/* Desktop Table */}
                                    <div className="hidden md:block overflow-x-auto bg-white rounded-lg border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    {activeTableColumns.map(col => (
                                                        <th key={col.key} scope="col" className={`px-3 py-2 text-left font-medium text-gray-500 ${col.key === 'quantity' ? 'text-right' : ''}`}>
                                                            {col.label}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {logs.map(log => (
                                                    <tr key={log.logID}>
                                                        {activeTableColumns.map(col => (
                                                            <td key={col.key} className={`px-3 py-2 ${col.key === 'quantity' ? 'text-right' : ''}`}>
                                                                {renderCell(log, col.key)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* Mobile Card View for Location Groups */}
                                    <div className="md:hidden space-y-3">
                                        {logs.map(log => renderMobileCard(log))}
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
        </>
      ) : (
        <CountLogView hideHeader />
      )}
    </div>
  );
};

export default TransactionLogs;
