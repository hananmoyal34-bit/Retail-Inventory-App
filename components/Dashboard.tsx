



import React, { useMemo, useState, useEffect } from 'react';
import { Page, Product, InventoryLog, User, LocationOrder, CountLog, WarehouseCountLog, AppSheetProduct } from '../types';
import { getProducts, getInventoryLogs, getUsers, getLocationOrders, formatDateToYMD, getCountLogs, getWarehouseCountLogs, getAppSheetProducts } from '../services/dataService';
import { BoxIcon, ChartBarIcon, TruckIcon, ChevronDownIcon, ClipboardListIcon, WarehouseIcon } from './icons';
import LocationTag from './LocationTag';

interface DashboardProps {
  setActivePage: (page: Page) => void;
}

const LOW_STOCK_THRESHOLD = 10;

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
                        <p className="text-sm font-medium text-gray-600">Open Orders</p>
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
                            <span className="px-3 py-1 text-sm font-bold rounded-full bg-indigo-100 text-indigo-800">{item.count}</span>
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
    locationStock: Record<string, { productName: string; stock: number }[]>;
    onNavigate: () => void;
}> = ({ warehouseStock, locationStock, onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('warehouse');

    const lowStockWarehouseItems = useMemo(() => {
        if (!warehouseStock || Object.keys(warehouseStock).length === 0) return [];
        
        return Object.values(warehouseStock)
            .flat()
            .filter(p => p.totalStock <= LOW_STOCK_THRESHOLD)
            .map(p => ({ productName: p.productName, stock: p.totalStock }))
            .sort((a, b) => a.stock - b.stock || a.productName.localeCompare(b.productName));
            
    }, [warehouseStock]);

    const lowStockLocationItems = useMemo(() => {
        const itemsByLocation: Record<string, { productName: string; stock: number }[]> = {};
        Object.entries(locationStock).forEach(([location, products]) => {
            const lowItems = products
                .filter(p => p.stock <= LOW_STOCK_THRESHOLD)
                .sort((a,b) => a.stock - b.stock);

            if (lowItems.length > 0) {
                itemsByLocation[location] = lowItems;
            }
        });
        return itemsByLocation;
    }, [locationStock]);

    const totalLowStockItems = lowStockWarehouseItems.length + Object.values(lowStockLocationItems).flat().length;

    return (
        <GlassCard className="p-5 flex flex-col">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left">
                <div className="flex items-center">
                    <div className="p-3 bg-white/50 rounded-full mr-4">
                       <ChartBarIcon className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600">Items Low on Stock</p>
                        <p className="text-3xl font-bold text-gray-900">{totalLowStockItems}</p>
                    </div>
                </div>
                <ChevronDownIcon className={`h-6 w-6 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-96 mt-4 pt-4 border-t border-white/30' : 'max-h-0'}`}>
                <div className="border-b border-gray-200/50">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                        <button onClick={() => setActiveTab('warehouse')} className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-xs ${activeTab === 'warehouse' ? 'border-yellow-600 text-yellow-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Warehouse</button>
                        <button onClick={() => setActiveTab('locations')} className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-xs ${activeTab === 'locations' ? 'border-yellow-600 text-yellow-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Locations</button>
                    </nav>
                </div>
                <div className="divide-y divide-white/20 max-h-64 overflow-y-auto pr-2 pt-2">
                    {activeTab === 'warehouse' && (
                        lowStockWarehouseItems.length > 0 ? lowStockWarehouseItems.map(item => (
                            <div key={item.productName} className="py-2 flex justify-between items-center">
                                <p className="text-sm font-medium text-gray-800">{item.productName}</p>
                                <span className="px-3 py-1 text-sm font-bold rounded-full bg-red-100 text-red-800">{item.stock}</span>
                            </div>
                        )) : <p className="py-3 text-sm text-gray-500">No warehouse items are low on stock.</p>
                    )}
                     {activeTab === 'locations' && (
                        Object.keys(lowStockLocationItems).length > 0 ? Object.entries(lowStockLocationItems).map(([location, items]) => (
                            <div key={location} className="py-2">
                                <LocationTag location={location} />
                                <ul className="pl-4 mt-1 space-y-1">
                                    {items.map(item => (
                                         <li key={item.productName} className="flex justify-between items-center text-sm">
                                            <span className="text-gray-800">{item.productName}</span>
                                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-800">{item.stock}</span>
                                         </li>
                                    ))}
                                </ul>
                            </div>
                        )) : <p className="py-3 text-sm text-gray-500">No location items are low on stock.</p>
                    )}
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
        <div className="bg-white/20 p-5 rounded-2xl shadow-lg animate-pulse h-60"></div>
        <div className="space-y-4 pt-6">
             <div className="h-9 bg-slate-300/50 rounded w-1/3 animate-pulse"></div>
            <div className="h-4 bg-slate-300/50 rounded w-1/4 animate-pulse"></div>
            <div className="bg-white/20 p-5 rounded-2xl shadow-lg animate-pulse h-96"></div>
        </div>
    </div>
);


const Dashboard: React.FC<DashboardProps> = ({ setActivePage }) => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [locationOrders, setLocationOrders] = useState<LocationOrder[]>([]);
  const [countLogs, setCountLogs] = useState<CountLog[]>([]);
  const [warehouseCountLogs, setWarehouseCountLogs] = useState<WarehouseCountLog[]>([]);
  const [appSheetProducts, setAppSheetProducts] = useState<AppSheetProduct[]>([]);
  const [activeStockTab, setActiveStockTab] = useState('locations');
  const [isRecentActivityOpen, setIsRecentActivityOpen] = useState(false);
  
  // State for expand/collapse functionality
  const [expandedStockLocations, setExpandedStockLocations] = useState<Set<string>>(new Set());
  const [expandedWarehouseCategories, setExpandedWarehouseCategories] = useState<Set<string>>(new Set());


  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        try {
            const [productsData, logsData, usersData, ordersData, counts, warehouseLogsData, appSheetProductsData] = await Promise.all([
                getProducts(),
                getInventoryLogs(),
                getUsers(),
                getLocationOrders(),
                getCountLogs(),
                getWarehouseCountLogs(),
                getAppSheetProducts(),
            ]);
            setProducts(productsData);
            setInventoryLogs(logsData);
            setUsers(usersData);
            setLocationOrders(ordersData);
            setCountLogs(counts);
            setWarehouseCountLogs(warehouseLogsData);
            setAppSheetProducts(appSheetProductsData);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, []);
  
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
        ...inventoryLogs.map(l => `${l.productName}#${l.location}`),
        ...countLogs.map(c => `${c.productName}#${c.location}`)
    ]);

    allProductLocationKeys.forEach(key => {
        const latestCount = latestCounts.get(key);

        if (latestCount) {
            let stock = latestCount.count;
            const subsequentTransactions = inventoryLogs.filter(log => {
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
            inventoryLogs.forEach(log => {
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
  }, [inventoryLogs, countLogs]);

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

  const renderTabButton = (tabName: string, label: string) => {
    const isActive = activeStockTab === tabName;
    return (
      <button
        onClick={() => setActiveStockTab(tabName)}
        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
            isActive
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        {label}
      </button>
    );
  };
  
  const handleToggleLocation = (e: React.MouseEvent, location: string) => {
    e.preventDefault(); // Prevent default <details> behavior
    setExpandedStockLocations(prev => {
        const newSet = new Set(prev);
        if (newSet.has(location)) newSet.delete(location);
        else newSet.add(location);
        return newSet;
    });
  };

  const handleToggleWarehouse = (e: React.MouseEvent, category: string) => {
    e.preventDefault(); // Prevent default <details> behavior
    setExpandedWarehouseCategories(prev => {
        const newSet = new Set(prev);
        if (newSet.has(category)) newSet.delete(category);
        else newSet.add(category);
        return newSet;
    });
  };

  if (loading) {
      return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <OpenOrdersCard total={totalOpenOrders} items={openOrdersByLocation} onNavigate={() => setActivePage(Page.ORDERS)} />
            <LowStockCard warehouseStock={warehouseStock} locationStock={groupedStock} onNavigate={() => setActivePage(Page.LOW_STOCK_PRODUCTS)} />
            <ProductListCard products={appSheetProducts} onNavigate={() => setActivePage(Page.PRODUCTS)} />
        </div>

        <GlassCard className="p-5">
            <button 
                onClick={() => setIsRecentActivityOpen(!isRecentActivityOpen)}
                className="w-full flex justify-between items-center text-left"
                aria-expanded={isRecentActivityOpen}
            >
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <ChevronDownIcon className={`h-6 w-6 text-gray-500 transition-transform duration-300 ${isRecentActivityOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isRecentActivityOpen ? 'max-h-96 mt-4 pt-4 border-t border-white/30' : 'max-h-0'}`}>
                <ul className="space-y-3">
                    {inventoryLogs.slice(-5).reverse().map(log => (
                        <li key={log.logID} className="text-sm text-gray-600 flex items-center flex-wrap gap-x-2 gap-y-1 transition-colors duration-200 hover:bg-white/40 p-2 -m-2 rounded-lg">
                            <span className={`font-semibold ${log.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {log.quantity > 0 ? `+${log.quantity}` : log.quantity} 
                            </span>
                            <span className="font-medium text-gray-800">{log.productName}</span>
                            <span>({log.transactionType}) at</span>
                            <LocationTag location={log.location} />
                        </li>
                    ))}
                </ul>
            </div>
        </GlassCard>

        <div className="space-y-6 pt-6">
            <h2 className="text-3xl font-bold text-gray-900">Total Inventory per Location</h2>

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {renderTabButton('locations', 'Locations Stock')}
                    {renderTabButton('warehouse', 'Warehouse Stock')}
                </nav>
            </div>
            
            {activeStockTab === 'locations' && (
                <div className="space-y-4 pt-4">
                    <div className="flex justify-between items-center mb-2">
                        <button
                            onClick={() => setActivePage(Page.INVENTORY_LOG)}
                            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 transition-colors flex items-center gap-1.5"
                            aria-label="Navigate to Locations Inventory page"
                        >
                            <ClipboardListIcon className="h-4 w-4" />
                            <span>Navigate to Locations Inventory</span>
                        </button>
                        <div className="flex space-x-2">
                            <button onClick={() => setExpandedStockLocations(new Set(Object.keys(groupedStock)))} className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md">Expand All</button>
                            <button onClick={() => setExpandedStockLocations(new Set())} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-md">Collapse All</button>
                        </div>
                    </div>
                    {Object.keys(groupedStock).length > 0 ? Object.entries(groupedStock).map(([location, products]) => (
                    <details key={location} className="bg-white shadow-lg rounded-xl overflow-hidden group transition-all duration-300" open={expandedStockLocations.has(location)}>
                        <summary className="px-6 py-4 text-xl font-semibold text-gray-800 cursor-pointer list-none flex justify-between items-center hover:bg-gray-50 transition-colors" onClick={(e) => handleToggleLocation(e, location)}>
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

            {activeStockTab === 'warehouse' && (
                <div className="space-y-4 pt-4">
                     <div className="flex justify-between items-center mb-2">
                        <button
                            onClick={() => setActivePage(Page.WAREHOUSE_INVENTORY)}
                            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 transition-colors flex items-center gap-1.5"
                            aria-label="Navigate to Warehouse Inventory page"
                        >
                            <WarehouseIcon className="h-4 w-4" />
                            <span>Navigate to Warehouse Inventory</span>
                        </button>
                        <div className="flex space-x-2">
                            <button onClick={() => setExpandedWarehouseCategories(new Set(Object.keys(warehouseStock)))} className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md">Expand All</button>
                            <button onClick={() => setExpandedWarehouseCategories(new Set())} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-md">Collapse All</button>
                        </div>
                    </div>
                    {Object.keys(warehouseStock).length > 0 ? Object.entries(warehouseStock).map(([category, products]) => (
                    <details key={category} className="bg-white shadow-md rounded-xl overflow-hidden group transition-all duration-300" open={expandedWarehouseCategories.has(category)}>
                        <summary className="px-6 py-4 text-xl font-bold text-gray-800 cursor-pointer list-none flex justify-between items-center bg-gray-100 hover:bg-gray-200 transition-colors" onClick={(e) => handleToggleWarehouse(e, category)}>
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
                                        <div className="flex items-center gap-4">
                                            <span className="text-indigo-700">{productName}</span>
                                        </div>
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
                                        {colors.map((item) => {
                                            const stockLevelClasses = 
                                                item.quantity <= 0 
                                                ? 'bg-red-100 text-red-800'
                                                : item.quantity <= LOW_STOCK_THRESHOLD 
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-green-100 text-green-800';

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
                            <p className="text-lg">No warehouse stock data available.</p>
                            <p className="text-sm mt-1">Please perform a count on the 'Warehouse Count' tab to see data here.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default Dashboard;