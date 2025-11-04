import React, { useState, useEffect, useMemo } from 'react';
import { InventoryLog as InventoryLogType, WarehouseCountLog, AppSheetProduct } from '../types';
import { getInventoryLogs, getWarehouseCountLogs, getAppSheetProducts, formatDateToYMD, formatToLocaleString } from '../services/dataService';
import DatePicker from './DatePicker';
import { ChevronRightIcon, SearchIcon } from './icons';

const WarehouseInventory: React.FC = () => {
    const [activeTab, setActiveTab] = useState('inventory');
    const [loading, setLoading] = useState(true);
    
    const [inventoryLogs, setInventoryLogs] = useState<InventoryLogType[]>([]);
    const [warehouseCountLogs, setWarehouseCountLogs] = useState<WarehouseCountLog[]>([]);
    const [appSheetProducts, setAppSheetProducts] = useState<AppSheetProduct[]>([]);

    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTransactionType, setSelectedTransactionType] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState('');

    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    
    // New state for view modes and expansion in grouped views
    const [countLogViewMode, setCountLogViewMode] = useState<'chronological' | 'byProduct'>('chronological');
    const [transactionViewMode, setTransactionViewMode] = useState<'chronological' | 'byProduct'>('chronological');
    const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [logsData, warehouseLogsData, appSheetProductsData] = await Promise.all([
                    getInventoryLogs(),
                    getWarehouseCountLogs(),
                    getAppSheetProducts(),
                ]);
                
                setInventoryLogs(logsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                setWarehouseCountLogs(warehouseLogsData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
                setAppSheetProducts(appSheetProductsData);
            } catch (error) {
                console.error("Failed to fetch warehouse inventory data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const productThresholdMap = useMemo(() => {
        const map = new Map<string, number>();
        appSheetProducts.forEach(p => {
            map.set(p.name, p.lowStockThreshold);
        });
        return map;
    }, [appSheetProducts]);

    const warehouseStock = useMemo(() => {
        if (warehouseCountLogs.length === 0 || appSheetProducts.length === 0) return {};

        const productCategoryMap = new Map<string, string>();
        appSheetProducts.forEach(p => {
            productCategoryMap.set(p.name, p.category || 'Uncategorized');
        });

        // Find the timestamp of the latest submission
        const latestTimestamp = Math.max(...warehouseCountLogs.map(log => new Date(log.timestamp).getTime()));
        if (!isFinite(latestTimestamp)) return {};

        // Define a "session" as logs submitted within a 5-minute window of the latest log
        const SESSION_WINDOW = 5 * 60 * 1000;
        const sessionStartTime = latestTimestamp - SESSION_WINDOW;

        const recentLogs = warehouseCountLogs.filter(log => {
            try {
                const logTime = new Date(log.timestamp).getTime();
                return logTime >= sessionStartTime && logTime <= latestTimestamp;
            } catch(e) { return false; }
        });

        // Calculate stock based ONLY on this latest submission
        const stockMap = new Map<string, { totalStock: number; colors: { color: string; quantity: number }[] }>();

        recentLogs.forEach(log => {
            if (log.quantity >= 0) { // Should always be positive from warehouse count
                const entry = stockMap.get(log.productName) || { totalStock: 0, colors: [] };
                entry.totalStock += log.quantity;
                
                const colorEntry = entry.colors.find(c => c.color === log.color);
                if (colorEntry) {
                    colorEntry.quantity += log.quantity;
                } else {
                    entry.colors.push({ color: log.color, quantity: log.quantity });
                }
                stockMap.set(log.productName, entry);
            }
        });

        const productsWithCategory = Array.from(stockMap.entries())
            .map(([productName, data]) => {
                data.colors.sort((a, b) => a.color.localeCompare(b.color));
                return { 
                    productName, 
                    category: productCategoryMap.get(productName) || 'Uncategorized',
                    ...data 
                };
            });

        const groupedByCategory = productsWithCategory.reduce((acc, product) => {
            const category = product.category;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(product);
            acc[category].sort((a, b) => a.productName.localeCompare(b.productName));
            return acc;
        }, {} as Record<string, typeof productsWithCategory>);
        
        return Object.keys(groupedByCategory).sort().reduce(
          (obj, key) => { 
            obj[key] = groupedByCategory[key]; 
            return obj;
          }, 
          {} as typeof groupedByCategory
        );
    }, [warehouseCountLogs, appSheetProducts]);
    
    useEffect(() => {
        if (!loading && isInitialLoad && Object.keys(warehouseStock).length > 0) {
            setExpandedCategories(new Set(Object.keys(warehouseStock)));
            setIsInitialLoad(false);
        }
    }, [loading, isInitialLoad, warehouseStock]);

    const filteredWarehouseStock = useMemo(() => {
        const lowercasedQuery = searchQuery.toLowerCase().trim();
        if (!lowercasedQuery) {
            return warehouseStock;
        }

        const filtered: typeof warehouseStock = {};
        // FIX: Add explicit type casting for Object.entries to resolve 'unknown' type errors in TypeScript.
        (Object.entries(warehouseStock) as [string, any[]][]).forEach(([category, products]) => {
            const matchingProducts = products.filter(product => 
                product.productName.toLowerCase().includes(lowercasedQuery)
            );
            if (matchingProducts.length > 0) {
                filtered[category] = matchingProducts;
            }
        });
        return filtered;
    }, [warehouseStock, searchQuery]);

    useEffect(() => {
        if (searchQuery) {
            setExpandedCategories(new Set(Object.keys(filteredWarehouseStock)));
        }
    }, [searchQuery, filteredWarehouseStock]);

    const lowStockItems = useMemo(() => {
        if (Object.keys(warehouseStock).length === 0) return [];
        
        const lowStockList: { productName: string; category: string; totalStock: number }[] = [];

        Object.entries(warehouseStock).forEach(([category, products]) => {
            // FIX: Add explicit type casting for products to resolve 'unknown' type errors in TypeScript.
            (products as any[]).forEach(product => {
                const threshold = productThresholdMap.get(product.productName) ?? 10;
                if(product.totalStock <= threshold) {
                    lowStockList.push({
                        productName: product.productName,
                        totalStock: product.totalStock,
                        category
                    });
                }
            });
        });
        
        return lowStockList.sort((a, b) => a.totalStock - b.totalStock || a.productName.localeCompare(b.productName));
    }, [warehouseStock, productThresholdMap]);

    const transactionTypes = useMemo(() => {
        if (loading) return ['All'];
        const types = new Set(inventoryLogs.filter(log => log.location.toLowerCase() === 'warehouse').map(log => log.transactionType));
        return ['All', ...Array.from(types).sort()];
      }, [inventoryLogs, loading]);

    const filteredLogs = useMemo(() => {
        return inventoryLogs.filter(log => {
            if (log.location.toLowerCase() !== 'warehouse') {
                return false;
            }
            const typeMatch = selectedTransactionType === 'All' || log.transactionType === selectedTransactionType;
            if (!selectedDate) return typeMatch;
            const logDateStr = formatDateToYMD(log.date);
            const dateMatch = logDateStr === selectedDate;
            return dateMatch && typeMatch;
        });
    }, [inventoryLogs, selectedDate, selectedTransactionType]);

    const filteredCountLogs = useMemo(() => {
        return warehouseCountLogs.filter(log => {
            if (!selectedDate) return true;
            const logDateStr = formatDateToYMD(log.timestamp);
            return logDateStr === selectedDate;
        });
    }, [warehouseCountLogs, selectedDate]);
    
    // --- Grouped Data for New Views ---
    const groupedCountLogs = useMemo(() => {
        if (countLogViewMode !== 'byProduct') return {};
        return filteredCountLogs.reduce((acc, log) => {
            if (!acc[log.productName]) {
                acc[log.productName] = [];
            }
            acc[log.productName].push(log);
            return acc;
        }, {} as Record<string, WarehouseCountLog[]>);
    }, [filteredCountLogs, countLogViewMode]);

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

    const clearFilters = () => {
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

    const handleToggleCategory = (e: React.MouseEvent, category: string) => {
        e.preventDefault();
        setExpandedCategories(prev => {
          const newSet = new Set(prev);
          if (newSet.has(category)) {
            newSet.delete(category);
          } else {
            newSet.add(category);
          }
          return newSet;
        });
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
                <h2 className="text-3xl font-bold text-gray-900">Warehouse Inventory</h2>
                <p>Loading warehouse data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-900">Warehouse Inventory</h2>
                <p className="text-gray-600 mt-1">A permanent ledger of all warehouse inventory, counts, and transactions.</p>
            </div>

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
                    {renderTabButton('inventory', 'Inventory')}
                    {renderTabButton('lowStock', 'Low Stock')}
                    {renderTabButton('counts', 'Count Log')}
                    {renderTabButton('transactions', 'Transactions')}
                </nav>
            </div>

            {(activeTab === 'counts' || activeTab === 'transactions') && (
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                        <DatePicker label="Filter by Date" value={selectedDate} onChange={setSelectedDate} />
                        
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
                {activeTab === 'inventory' && (
                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-lg shadow-md">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="search"
                                    placeholder="Search products in warehouse..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2 mb-2">
                            <button onClick={() => setExpandedCategories(new Set(Object.keys(filteredWarehouseStock)))} className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md">Expand All</button>
                            <button onClick={() => setExpandedCategories(new Set())} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-md">Collapse All</button>
                        </div>
                        {Object.keys(filteredWarehouseStock).length > 0 ? (Object.entries(filteredWarehouseStock) as [string, any[]][]).map(([category, products]) => (
                        <details key={category} className="bg-white shadow-md rounded-xl overflow-hidden group transition-all duration-300" open={expandedCategories.has(category)}>
                            <summary className="px-6 py-4 text-xl font-bold text-gray-800 cursor-pointer list-none flex justify-between items-center bg-gray-100 hover:bg-gray-200 transition-colors" onClick={(e) => handleToggleCategory(e, category)}>
                                <span>{category}</span>
                                <span className="text-indigo-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform transition-transform duration-200 group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </span>
                            </summary>
                            <div className="p-2 space-y-2 bg-gray-50">
                                {products.map(({ productName, totalStock, colors }) => (
                                    <details key={productName} className="bg-white shadow-lg rounded-xl overflow-hidden group/product transition-all duration-300">
                                        <summary className="px-6 py-4 text-lg font-semibold text-gray-800 cursor-pointer list-none flex justify-between items-center hover:bg-gray-50 transition-colors">
                                            <span className="text-indigo-700">{productName}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-gray-500 text-base font-normal">({totalStock} units / {colors.length} colors)</span>
                                                <span className="text-indigo-600">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform transition-transform duration-200 group-open/product:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </span>
                                            </div>
                                        </summary>
                                        <div className="border-t border-gray-200 divide-y divide-gray-100">
                                            <div className="px-6 py-4 flex justify-between items-center bg-indigo-50 font-bold">
                                                <p className="text-lg text-indigo-800 pr-4">Total Stock</p>
                                                <span className={`px-4 py-1.5 min-w-[60px] text-center text-lg font-bold rounded-full bg-indigo-200 text-indigo-900`}>
                                                    {totalStock}
                                                </span>
                                            </div>
                                            {colors.map((item: any) => {
                                                const threshold = productThresholdMap.get(productName) ?? 10;
                                                const stockLevelClasses = item.quantity <= 0 ? 'bg-red-100 text-red-800' : item.quantity <= threshold ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
                                                return (
                                                    <div key={item.color} className="px-6 py-3 flex justify-between items-center hover:bg-gray-50/50 ml-4">
                                                        <p className="text-base font-medium text-gray-800 pr-4">{item.color}</p>
                                                        <span className={`px-3 py-1 min-w-[50px] text-center text-base font-bold rounded-full ${stockLevelClasses}`}>
                                                            {item.quantity}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </details>
                                ))}
                            </div>
                        </details>
                        )) : (
                            <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow">
                                {searchQuery ? <p className="text-lg">No products found matching your search.</p> :
                                <>
                                 <p className="text-lg">No warehouse stock data available.</p>
                                 <p className="text-sm mt-1">Please perform a count on the 'Warehouse Count' tab to see data here.</p>
                                </>
                               }
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'lowStock' && (
                    <div className="bg-white shadow-md rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Stock</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {lowStockItems.length > 0 ? lowStockItems.map((item) => (
                                    <tr key={item.productName} className="odd:bg-white even:bg-yellow-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.productName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 text-right">{item.totalStock}</td>
                                    </tr>
                                    )) : (
                                    <tr>
                                        <td colSpan={3} className="text-center py-10 text-gray-500">No warehouse items are low on stock.</td>
                                    </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {activeTab === 'counts' && (
                     <>
                        {renderViewModeToggle(countLogViewMode, setCountLogViewMode)}
                        {countLogViewMode === 'chronological' ? (
                        <div className="bg-white shadow-md rounded-lg overflow-hidden">
                            <div className="hidden md:block overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredCountLogs.length > 0 ? filteredCountLogs.map((log) => (
                                        <tr key={log.countID} className="odd:bg-white even:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.productName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.color}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold text-right">{log.quantity}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 italic">{log.notes}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatToLocaleString(log.timestamp)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.user}</td>
                                        </tr>
                                        )) : (
                                        <tr>
                                            <td colSpan={6} className="text-center py-10 text-gray-500">No count logs match the current filters.</td>
                                        </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="md:hidden p-4 space-y-4 bg-gray-50">
                                {filteredCountLogs.length > 0 ? filteredCountLogs.map(log => (
                                    <details key={log.countID} className="bg-white p-4 rounded-lg shadow-sm border group">
                                        <summary className="list-none flex justify-between items-center cursor-pointer">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-gray-800">{log.productName}</h3>
                                                <p className="text-sm text-gray-600">{log.color}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0 pl-2">
                                                <p className="font-bold text-lg text-indigo-600">{log.quantity}</p>
                                            </div>
                                            <ChevronRightIcon className="h-5 w-5 text-gray-500 ml-2 transition-transform group-open:rotate-90" />
                                        </summary>
                                        <div className="mt-3 pt-3 border-t text-sm space-y-2">
                                            {log.notes && <p className="italic text-gray-600"><strong>Notes:</strong> "{log.notes}"</p>}
                                            <p><strong>User:</strong> {log.user}</p>
                                            <p className="text-xs text-gray-500">{formatToLocaleString(log.timestamp)}</p>
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
                            {Object.keys(groupedCountLogs).length > 0 ? (Object.entries(groupedCountLogs) as [string, WarehouseCountLog[]][]).map(([productName, logs]) => (
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
                                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Color</th>
                                                        <th className="px-3 py-2 text-right font-medium text-gray-500">Qty</th>
                                                        <th className="px-3 py-2 text-left font-medium text-gray-500">User</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {logs.map(log => (
                                                        <tr key={log.countID}>
                                                            <td className="px-3 py-2 whitespace-nowrap">{formatToLocaleString(log.timestamp)}</td>
                                                            <td className="px-3 py-2">{log.color}</td>
                                                            <td className="px-3 py-2 text-right font-semibold">{log.quantity}</td>
                                                            <td className="px-3 py-2">{log.user}</td>
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
                    </>
                )}

                {activeTab === 'transactions' && (
                    <>
                        {renderViewModeToggle(transactionViewMode, setTransactionViewMode)}
                        {transactionViewMode === 'chronological' ? (
                        <div className="bg-white shadow-md rounded-lg overflow-hidden">
                            <div className="hidden md:block overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction Type</th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Log ID</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                                        <tr key={log.logID} className="odd:bg-white even:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{log.productName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.quantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {log.transactionType}
                                            </span>
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${log.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.logID}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatToLocaleString(log.date)}</td>
                                        </tr>
                                        )) : (
                                        <tr>
                                            <td colSpan={5} className="text-center py-10 text-gray-500">No logs match the current filters.</td>
                                        </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="md:hidden p-4 space-y-4 bg-gray-50">
                            {filteredLogs.length > 0 ? filteredLogs.map(log => (
                                <div key={log.logID} className="bg-white p-4 rounded-lg shadow-sm border">
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-gray-800 pr-2">{log.productName}</span>
                                        <span className={`font-bold text-lg flex-shrink-0 ${log.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                                        </span>
                                    </div>
                                    <div className="text-sm mt-2">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.quantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {log.transactionType}
                                        </span>
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
                            {Object.keys(groupedTransactionLogs).length > 0 ? (Object.entries(groupedTransactionLogs) as [string, InventoryLogType[]][]).map(([productName, logs]) => (
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
                                                        <th className="px-3 py-2 text-left font-medium text-gray-500">Type</th>
                                                        <th className="px-3 py-2 text-right font-medium text-gray-500">Qty</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {logs.map(log => (
                                                        <tr key={log.logID}>
                                                            <td className="px-3 py-2 whitespace-nowrap">{formatToLocaleString(log.date)}</td>
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
                    </>
                )}
            </div>
        </div>
    );
};

export default WarehouseInventory;