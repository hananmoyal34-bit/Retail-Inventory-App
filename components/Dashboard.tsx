
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Page, Product, InventoryLog, User, LocationOrder, CountLog, WarehouseCountLog, AppSheetProduct, Location } from '../types';
import { getProducts, getInventoryLogs, getUsers, getLocationOrders, formatDateToYMD, getCountLogs, getWarehouseCountLogs, getAppSheetProducts, getLocations, getCurrentDateInTimezone, formatToLocaleString } from '../services/dataService';
import { BoxIcon, ChartBarIcon, TruckIcon, ChevronDownIcon, ClipboardListIcon, WarehouseIcon, ChevronRightIcon, AdjustmentsIcon } from './icons';
import LocationTag from './LocationTag';
import DatePicker from './DatePicker';


interface DashboardProps {
  setActivePage: (page: Page) => void;
}

// --- Reusable Styled Components ---

const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-white/40 backdrop-blur-lg rounded-2xl shadow-lg border border-white/20 ${className}`}>
        {children}
    </div>
);

// --- New Dashboard Card Components ---

const OpenOrdersCard: React.FC<{ 
    total: number; 
    items: { location: string, count: number }[];
    onNavigate: () => void;
}> = ({ total, items, onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <GlassCard className="p-5 flex flex-col">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left"
                aria-label={isOpen ? "Hide details" : "Show details"}
                aria-controls="open-orders-details"
                aria-expanded={isOpen}
                disabled={items.length === 0}
            >
                <div className="flex items-center">
                    <div className="p-3 bg-white/50 rounded-full mr-4">
                       <TruckIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600">Locations w/ Open Orders</p>
                        <p className="text-3xl font-bold text-gray-900">{total}</p>
                    </div>
                </div>
                <ChevronDownIcon className={`h-6 w-6 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div id="open-orders-details" className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-96 mt-4 pt-4 border-t border-white/30' : 'max-h-0'}`}>
                <div className="divide-y divide-white/20 max-h-64 overflow-y-auto pr-2">
                    {items.length > 0 ? items.map(item => (
                        <div key={item.location} className="py-2 flex justify-between items-center">
                            <LocationTag location={item.location} />
                            <span className="px-3 py-1 text-sm font-bold rounded-full bg-indigo-100 text-indigo-800">{item.count} items</span>
                        </div>
                    )) : (
                        <p className="py-3 text-sm text-gray-500">No open orders at the moment.</p>
                    )}
                </div>
            </div>
             <div className="mt-auto pt-4">
                <button onClick={onNavigate} className="w-full text-center px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-100 rounded-lg hover:bg-indigo-200 transition-colors">
                    View All Orders
                </button>
            </div>
        </GlassCard>
    );
};


const LowStockCard: React.FC<{
    warehouseStock: Record<string, { productName: string; totalStock: number }[]>;
    appSheetProducts: AppSheetProduct[];
    onNavigate: () => void;
}> = ({ warehouseStock, appSheetProducts, onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);

    const productThresholdMap = useMemo(() => {
        const map = new Map<string, number>();
        appSheetProducts.forEach(p => {
            map.set(p.name, p.lowStockThreshold);
        });
        return map;
    }, [appSheetProducts]);

    const lowStockWarehouseItems = useMemo(() => {
        if (!warehouseStock || Object.keys(warehouseStock).length === 0) return [];
        
        return Object.values(warehouseStock)
            .flat()
            .filter((p: { productName: string; totalStock: number }) => {
                const threshold = productThresholdMap.get(p.productName) ?? 10;
                return p.totalStock <= threshold;
            })
            .map((p: { productName: string; totalStock: number }) => ({ productName: p.productName, stock: p.totalStock }))
            .sort((a, b) => a.stock - b.stock || a.productName.localeCompare(b.productName));
            
    }, [warehouseStock, productThresholdMap]);

    const totalLowStockItems = lowStockWarehouseItems.length;

    return (
        <GlassCard className="p-5 flex flex-col">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left">
                <div className="flex items-center">
                    <div className="p-3 bg-white/50 rounded-full mr-4">
                       <ChartBarIcon className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600">Warehouse Low Stock</p>
                        <p className="text-3xl font-bold text-gray-900">{totalLowStockItems}</p>
                    </div>
                </div>
                <ChevronDownIcon className={`h-6 w-6 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-96 mt-4 pt-4 border-t border-white/30' : 'max-h-0'}`}>
                <div className="divide-y divide-white/20 max-h-64 overflow-y-auto pr-2 pt-2">
                    {lowStockWarehouseItems.length > 0 ? lowStockWarehouseItems.map(item => (
                        <div key={item.productName} className="py-2 flex justify-between items-center">
                            <p className="text-sm font-medium text-gray-800">{item.productName}</p>
                            <span className="px-3 py-1 text-sm font-bold rounded-full bg-red-100 text-red-800">{item.stock}</span>
                        </div>
                    )) : <p className="py-3 text-sm text-gray-500">No warehouse items are low on stock.</p>}
                </div>
            </div>
             <div className="mt-auto pt-4">
                <button onClick={onNavigate} className="w-full text-center px-4 py-2 text-sm font-semibold text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200 transition-colors">
                    View Low Stock Report
                </button>
            </div>
        </GlassCard>
    );
};

const ProductListCard: React.FC<{ 
    products: AppSheetProduct[];
    onNavigate: () => void;
}> = ({ products, onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const total = products.length;

    return (
        <GlassCard className="p-5 flex flex-col">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left"
                aria-expanded={isOpen}
            >
                 <div className="flex items-center">
                    <div className="p-3 bg-white/50 rounded-full mr-4">
                       <BoxIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600">Total Products</p>
                        <p className="text-3xl font-bold text-gray-900">{total}</p>
                    </div>
                </div>
                <ChevronDownIcon className={`h-6 w-6 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-96 mt-4 pt-4 border-t border-white/30' : 'max-h-0'}`}>
                <div className="divide-y divide-white/20 max-h-64 overflow-y-auto pr-2">
                    {products.length > 0 ? products.slice(0, 15).map(item => ( // Show first 15 for brevity
                        <div key={item.name} className="py-2 flex justify-between items-center">
                            <p className="text-sm font-medium text-gray-800">{item.name}</p>
                        </div>
                    )) : (
                        <p className="py-3 text-sm text-gray-500">No products found.</p>
                    )}
                    {products.length > 15 && <p className="text-center text-xs text-gray-500 pt-2">... and {products.length - 15} more</p>}
                </div>
            </div>
            <div className="mt-auto pt-4">
                 <button onClick={onNavigate} className="w-full text-center px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors">
                    View Full Product List
                </button>
            </div>
        </GlassCard>
    );
};


// --- Skeleton Loader ---

const SkeletonCard: React.FC<{ className?: string }> = ({ className = "" }) => (
    <div className={`bg-white/20 p-5 rounded-2xl shadow-lg animate-pulse ${className}`}>
        <div className="flex justify-between items-start">
            <div>
                <div className="h-4 bg-slate-300/50 rounded w-24 mb-2"></div>
                <div className="h-8 bg-slate-300/50 rounded w-16"></div>
            </div>
            <div className="h-12 w-12 bg-slate-300/50 rounded-full"></div>
        </div>
    </div>
);

const DashboardSkeleton: React.FC = () => (
    <div className="space-y-6">
        <div className="h-9 bg-slate-300/50 rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
        </div>
        <div className="space-y-4 pt-6">
             <div className="h-9 bg-slate-300/50 rounded w-1/3 animate-pulse"></div>
            <div className="h-4 bg-slate-300/50 rounded w-1/4 animate-pulse"></div>
            <div className="bg-white/20 p-5 rounded-2xl shadow-lg animate-pulse h-96"></div>
        </div>
    </div>
);

const COLUMN_DEFINITIONS = [
    { key: 'date', label: 'Date/Time' },
    { key: 'productName', label: 'Product Name' },
    { key: 'transactionType', label: 'Transaction Type' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'logID', label: 'Log ID' },
    { key: 'location', label: 'Location' },
];

const Dashboard: React.FC<DashboardProps> = ({ setActivePage }) => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationOrders, setLocationOrders] = useState<LocationOrder[]>([]);
  const [countLogs, setCountLogs] = useState<CountLog[]>([]);
  const [warehouseCountLogs, setWarehouseCountLogs] = useState<WarehouseCountLog[]>([]);
  const [appSheetProducts, setAppSheetProducts] = useState<AppSheetProduct[]>([]);
  
  // State for live data
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // State for new Transactions view
  const [isTransactionViewOpen, setIsTransactionViewOpen] = useState(true);
  const [selectedTransactionLogLocation, setSelectedTransactionLogLocation] = useState<string>('All');
  const [selectedTransactionLogDate, setSelectedTransactionLogDate] = useState<string>(getCurrentDateInTimezone());
  const [selectedTransactionLogType, setSelectedTransactionLogType] = useState<string>('Adjustment-Variance');
  
  // View mode states: Default to 'byLocation'
  const [transactionLogViewMode, setTransactionLogViewMode] = useState<'chronological' | 'byProduct' | 'byLocation'>('byLocation');
  const [expandedTransactionProducts, setExpandedTransactionProducts] = useState<Set<string>>(new Set());
  const [expandedTransactionLocations, setExpandedTransactionLocations] = useState<Set<string>>(new Set());

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    try {
      const savedColumns = localStorage.getItem('dashboardInventoryReportVisibleColumns');
      if (savedColumns) {
        return new Set(JSON.parse(savedColumns));
      }
    } catch (error) {
      console.error("Failed to load visible columns from local storage", error);
    }
    return new Set(COLUMN_DEFINITIONS.map(c => c.key));
  });

  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
        const [productsData, logsData, usersData, ordersData, counts, warehouseLogsData, appSheetProductsData, locationsData] = await Promise.all([
            getProducts(),
            getInventoryLogs(),
            getUsers(),
            getLocationOrders(),
            getCountLogs(),
            getWarehouseCountLogs(),
            getAppSheetProducts(),
            getLocations(),
        ]);
        setProducts(productsData);
        // Sort logs data newest first
        setInventoryLogs(logsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setUsers(usersData);
        setLocationOrders(ordersData);
        setCountLogs(counts);
        setWarehouseCountLogs(warehouseLogsData);
        setAppSheetProducts(appSheetProductsData);
        setLocations(locationsData);
        setLastUpdated(new Date());
    } catch (error) {
        console.error("Failed to fetch dashboard data", error);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      localStorage.setItem('dashboardInventoryReportVisibleColumns', JSON.stringify(Array.from(visibleColumns)));
    } catch (error) {
      console.error("Failed to save visible columns to local storage", error);
    }
  }, [visibleColumns]);
  
  const { openOrdersByLocation, totalOpenOrders } = useMemo(() => {
    const locationCounts = new Map<string, number>();
    locationOrders
      .filter(order => order.status === 'Pending')
      .forEach(order => {
        const location = order.location || 'Unassigned';
        locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
      });

    const items = Array.from(locationCounts.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
      
    const total = items.reduce((sum, item) => sum + item.count, 0);

    return { openOrdersByLocation: items, totalOpenOrders: total };
  }, [locationOrders]);

    const warehouseStock = useMemo(() => {
        if (warehouseCountLogs.length === 0 || appSheetProducts.length === 0) return {};

        const productCategoryMap = new Map<string, string>();
        appSheetProducts.forEach(p => {
            productCategoryMap.set(p.name, p.category || 'Uncategorized');
        });

        const stockMap = new Map<string, { totalStock: number; colors: Map<string, number> }>();

        // Iterate over ALL warehouse count logs to get cumulative totals
        warehouseCountLogs.forEach(log => {
            const entry = stockMap.get(log.productName) || { totalStock: 0, colors: new Map<string, number>() };
            entry.totalStock += log.quantity;
            const colorQty = entry.colors.get(log.color) || 0;
            entry.colors.set(log.color, colorQty + log.quantity);
            stockMap.set(log.productName, entry);
        });

        const productsWithCategory = Array.from(stockMap.entries())
            .map(([productName, data]) => {
                const colorsArray = Array.from(data.colors.entries())
                    .map(([color, quantity]) => ({ color, quantity }))
                    .sort((a, b) => a.color.localeCompare(b.color));
                
                return { 
                    productName, 
                    category: productCategoryMap.get(productName) || 'Uncategorized',
                    totalStock: data.totalStock,
                    colors: colorsArray
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

    // --- Memos and functions for new Transactions view ---
    const transactionTypes = useMemo(() => {
        const types = new Set(inventoryLogs.map(log => log.transactionType));
        return ['All', ...Array.from(types).sort()];
    }, [inventoryLogs]);

    const filteredTransactionLogs = useMemo(() => {
        return inventoryLogs.filter(log => {
            if (log.location.toLowerCase() === 'warehouse') return false;
            const locationMatch = selectedTransactionLogLocation === 'All' || log.location === selectedTransactionLogLocation;
            const typeMatch = selectedTransactionLogType === 'All' || log.transactionType === selectedTransactionLogType;
            if (!selectedTransactionLogDate) return locationMatch && typeMatch;
            const logDateStr = formatDateToYMD(log.date);
            const dateMatch = logDateStr === selectedTransactionLogDate;
            return locationMatch && dateMatch && typeMatch;
        });
    }, [inventoryLogs, selectedTransactionLogLocation, selectedTransactionLogDate, selectedTransactionLogType]);

    const groupedTransactionLogs = useMemo(() => {
        if (transactionLogViewMode !== 'byProduct') return {};
        return filteredTransactionLogs.reduce((acc, log) => {
            if (!acc[log.productName]) acc[log.productName] = [];
            acc[log.productName].push(log);
            return acc;
        }, {} as Record<string, InventoryLog[]>);
    }, [filteredTransactionLogs, transactionLogViewMode]);

    const groupedByLocationLogs = useMemo(() => {
        if (transactionLogViewMode !== 'byLocation') return {};
        return filteredTransactionLogs.reduce((acc, log) => {
            const key = log.location || 'Unknown';
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(log);
            return acc;
        }, {} as Record<string, InventoryLog[]>);
    }, [filteredTransactionLogs, transactionLogViewMode]);
    
    useEffect(() => {
        if (transactionLogViewMode === 'byProduct') {
            setExpandedTransactionProducts(new Set(Object.keys(groupedTransactionLogs)));
        } else if (transactionLogViewMode === 'byLocation') {
            setExpandedTransactionLocations(new Set(Object.keys(groupedByLocationLogs)));
        }
    }, [groupedTransactionLogs, groupedByLocationLogs, transactionLogViewMode]);

    const handleToggleTransactionProduct = (e: React.MouseEvent, productName: string) => {
        e.preventDefault();
        setExpandedTransactionProducts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productName)) newSet.delete(productName);
            else newSet.add(productName);
            return newSet;
        });
    };

    const handleToggleTransactionLocation = (e: React.MouseEvent, locationName: string) => {
        e.preventDefault();
        setExpandedTransactionLocations(prev => {
            const newSet = new Set(prev);
            if (newSet.has(locationName)) newSet.delete(locationName);
            else newSet.add(locationName);
            return newSet;
        });
    };
    
    const clearTransactionFilters = () => {
        setSelectedTransactionLogLocation('All');
        setSelectedTransactionLogDate('');
        setSelectedTransactionLogType('All');
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
            if (transactionLogViewMode === 'byLocation' && col.key === 'location') return false;
            if (transactionLogViewMode === 'byProduct' && col.key === 'productName') return false;
            return true;
        });
    }, [visibleColumns, transactionLogViewMode]);

    const renderCell = (log: InventoryLog, key: string) => {
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

    const renderMobileCard = (log: InventoryLog) => {
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
    // --------------------------------------------------

  if (loading) {
      return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
            {lastUpdated && (
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-white/50 px-3 py-1 rounded-full">
                    <div
                        className="w-2.5 h-2.5 rounded-full bg-green-500"
                        title="Live"
                    ></div>
                    <span>
                        Last updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Modified to show count of locations with open orders */}
            <OpenOrdersCard total={openOrdersByLocation.length} items={openOrdersByLocation} onNavigate={() => setActivePage(Page.ORDERS)} />
            <LowStockCard warehouseStock={warehouseStock} appSheetProducts={appSheetProducts} onNavigate={() => setActivePage(Page.PRODUCTS)} />
            <ProductListCard products={appSheetProducts} onNavigate={() => setActivePage(Page.PRODUCTS)} />
        </div>

        <GlassCard className="p-5">
            <button
                onClick={() => setIsTransactionViewOpen(!isTransactionViewOpen)}
                className="w-full flex justify-between items-center text-left"
                aria-expanded={isTransactionViewOpen}
            >
                <h3 className="text-lg font-semibold text-gray-900">Location Transactions</h3>
                <ChevronDownIcon className={`h-6 w-6 text-gray-500 transition-transform duration-300 ${isTransactionViewOpen ? 'rotate-180' : ''}`} />
            </button>
            {/* Fixed scrolling by using max-h-[500vh] and overflow-y-auto */}
            <div className={`transition-all duration-500 ease-in-out ${isTransactionViewOpen ? 'max-h-[500vh] overflow-y-auto mt-4 pt-4 border-t border-white/30' : 'max-h-0 overflow-hidden'}`}>
                <div className="p-4 mb-4 bg-white/20 rounded-lg">
                    <div className="flex flex-col sm:flex-row gap-4 items-end justify-between">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end w-full">
                            <div>
                                <label htmlFor="txn-location-filter" className="block text-sm font-medium text-gray-700">Location</label>
                                <select id="txn-location-filter" value={selectedTransactionLogLocation} onChange={(e) => setSelectedTransactionLogLocation(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm">
                                    <option value="All">All Locations</option>
                                    {locations.map(loc => <option key={loc.id} value={loc.name}>{loc.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="txn-type-filter" className="block text-sm font-medium text-gray-700">Transaction Type</label>
                                <select id="txn-type-filter" value={selectedTransactionLogType} onChange={(e) => setSelectedTransactionLogType(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm">
                                    {transactionTypes.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                            </div>
                            <div>
                                <DatePicker label="Filter by Date" value={selectedTransactionLogDate} onChange={setSelectedTransactionLogDate} />
                            </div>
                            <div>
                                <button onClick={clearTransactionFilters} className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
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

                <div className="space-y-3">
                    {renderViewModeToggle(transactionLogViewMode, setTransactionLogViewMode)}
                    
                    {transactionLogViewMode === 'chronological' ? (
                        <div className="bg-white/80 shadow rounded-lg overflow-hidden">
                            <div className="hidden md:block overflow-x-auto">
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
                                        {filteredTransactionLogs.length > 0 ? filteredTransactionLogs.map(log => (
                                            <tr key={log.logID}>
                                                {activeTableColumns.map(col => (
                                                    <td key={col.key} className={`px-3 py-2 whitespace-nowrap ${col.key === 'quantity' ? 'text-right' : ''}`}>
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
                            <div className="md:hidden space-y-3 p-4">
                                {filteredTransactionLogs.length > 0 ? filteredTransactionLogs.map(log => renderMobileCard(log)) : (
                                    <div className="text-center py-10 text-gray-500">No logs match the current filters.</div>
                                )}
                            </div>
                        </div>
                    ) : transactionLogViewMode === 'byProduct' ? (
                        Object.keys(groupedTransactionLogs).length > 0 ? (Object.entries(groupedTransactionLogs) as [string, InventoryLog[]][]).map(([productName, logs]) => (
                            <details key={productName} open={expandedTransactionProducts.has(productName)} className="bg-white/80 shadow rounded-lg transition-all duration-300 group">
                                <summary className="px-4 py-3 text-lg font-semibold text-gray-800 cursor-pointer list-none flex justify-between items-center hover:bg-white rounded-t-lg" onClick={(e) => handleToggleTransactionProduct(e, productName)}>
                                    <span>{productName}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-600 text-base font-normal">({logs.length} transactions)</span>
                                        <ChevronDownIcon className="h-5 w-5 text-gray-500 transform transition-transform duration-200 group-open:rotate-180" />
                                    </div>
                                </summary>
                                <div className="border-t border-gray-200 p-2 md:p-4">
                                    <div className="overflow-x-auto">
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
                                    <div className="md:hidden space-y-3 pt-2">
                                        {logs.map(log => renderMobileCard(log))}
                                    </div>
                                </div>
                            </details>
                        )) : (
                            <div className="text-center py-10 text-gray-500 bg-white/50 rounded-lg shadow">
                                <p>No transactions match the current filters.</p>
                            </div>
                        )
                    ) : (
                        // By Location View
                        Object.keys(groupedByLocationLogs).length > 0 ? (Object.entries(groupedByLocationLogs) as [string, InventoryLog[]][]).map(([locationName, logs]) => (
                            <details key={locationName} open={expandedTransactionLocations.has(locationName)} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-4 group">
                                <summary className="px-5 py-4 cursor-pointer list-none flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors" onClick={(e) => handleToggleTransactionLocation(e, locationName)}>
                                    <div className="flex flex-1 items-center justify-between gap-3">
                                        <div className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                             <div className="w-1 h-6 bg-indigo-500 rounded-full mr-1"></div> {/* Visual accent */}
                                             {locationName}
                                        </div> 
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="bg-white border border-gray-200 text-gray-600 py-1 px-3 rounded-full text-xs font-bold shadow-sm">{logs.length}</span>
                                            <ChevronDownIcon className="h-5 w-5 text-gray-400 transform transition-transform duration-200 group-open:rotate-180" />
                                        </div>
                                    </div>
                                </summary>
                                <div className="border-t border-gray-200 p-3 md:p-4 bg-gray-50/50">
                                    {/* Desktop Table View */}
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
                            <div className="text-center py-10 text-gray-500 bg-white/50 rounded-lg shadow">
                                <p>No transactions match the current filters.</p>
                            </div>
                        )
                    )}
                 </div>
            </div>
        </GlassCard>
    </div>
  );
};

export default Dashboard;
