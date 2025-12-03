
import React, { useMemo, useState, useEffect } from 'react';
import { InventoryLog, CountLog, Location, WarehouseCountLog, AppSheetProduct } from '../types';
import { getInventoryLogs, getCountLogs, formatDateToYMD, getLocations, getCurrentDateInTimezone, getWarehouseCountLogs, getAppSheetProducts } from '../services/dataService';
import LocationTag from './LocationTag';
import DatePicker from './DatePicker';

interface DailySummaryData {
    productName: string;
    location: string;
    stockIn: number;
    inStoreSales: number;
}

const LOW_STOCK_THRESHOLD = 10;

// FIX: Define a specific type for warehouse stock products to ensure type safety.
type WarehouseStockProduct = {
    productName: string;
    category: string;
    totalStock: number;
    colors: { color: string; quantity: number }[];
};


const CurrentStockView: React.FC = () => {
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [countLogs, setCountLogs] = useState<CountLog[]>([]);
  const [warehouseCountLogs, setWarehouseCountLogs] = useState<WarehouseCountLog[]>([]);
  const [appSheetProducts, setAppSheetProducts] = useState<AppSheetProduct[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('locations');

  // State for Daily Summary tab
  const [selectedDate, setSelectedDate] = useState(getCurrentDateInTimezone());
  const [selectedLocation, setSelectedLocation] = useState<string>('All');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [logs, counts, locationsData, warehouseLogsData, appSheetProductsData] = await Promise.all([
            getInventoryLogs(),
            getCountLogs(),
            getLocations(),
            getWarehouseCountLogs(),
            getAppSheetProducts(),
        ]);
        setInventoryLogs(logs);
        setCountLogs(counts);
        setLocations(locationsData);
        setWarehouseCountLogs(warehouseLogsData);
        setAppSheetProducts(appSheetProductsData);
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
        if (!productName || !location) return;
        
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

    const warehouseStock: Record<string, WarehouseStockProduct[]> = useMemo(() => {
        if (warehouseCountLogs.length === 0 || appSheetProducts.length === 0) return {};

        const productCategoryMap = new Map<string, string>();
        appSheetProducts.forEach(p => {
            productCategoryMap.set(p.name, p.category || 'Uncategorized');
        });

        const latestTimestamp = Math.max(...warehouseCountLogs.map(log => new Date(log.timestamp).getTime()));
        if (!isFinite(latestTimestamp)) return {};

        const SESSION_WINDOW = 5 * 60 * 1000; // 5 minutes
        const sessionStartTime = latestTimestamp - SESSION_WINDOW;

        const recentLogs = warehouseCountLogs.filter(log => {
            try {
                const logTime = new Date(log.timestamp).getTime();
                return logTime >= sessionStartTime && logTime <= latestTimestamp;
            } catch(e) { return false; }
        });

        const stockMap = new Map<string, { totalStock: number; colors: { color: string; quantity: number }[] }>();

        recentLogs.forEach(log => {
            if (log.quantity > 0) {
                const entry = stockMap.get(log.productName) || { totalStock: 0, colors: [] };
                entry.totalStock += log.quantity;
                entry.colors.push({ color: log.color, quantity: log.quantity });
                stockMap.set(log.productName, entry);
            }
        });

        const productsWithCategory: WarehouseStockProduct[] = Array.from(stockMap.entries())
            .map(([productName, data]) => {
                data.colors.sort((a, b) => a.color.localeCompare(b.color));
                return { 
                    productName, 
                    category: productCategoryMap.get(productName) || 'Uncategorized',
                    ...data 
                };
            });

        // FIX: Explicitly type the accumulator to ensure correct type inference downstream.
        const groupedByCategory = productsWithCategory.reduce((acc: Record<string, WarehouseStockProduct[]>, product) => {
            const category = product.category;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(product);
            acc[category].sort((a, b) => a.productName.localeCompare(b.productName));
            return acc;
// @FIx: Explicitly type the initial value of reduce to avoid type inference issues.
        }, {} as Record<string, WarehouseStockProduct[]>);
        
        // FIX: Explicitly type the accumulator to ensure correct type inference downstream.
        return Object.keys(groupedByCategory).sort().reduce(
          (obj: Record<string, WarehouseStockProduct[]>, key) => { 
            obj[key] = groupedByCategory[key]; 
            return obj;
          }, 
// @FIx: Explicitly type the initial value of reduce to avoid type inference issues.
          {} as Record<string, WarehouseStockProduct[]>
        );

    }, [warehouseCountLogs, appSheetProducts]);

  const clearFilters = () => {
    setSelectedLocation('All');
    setSelectedDate(getCurrentDateInTimezone());
  };

  const summaryData = useMemo(() => {
      if (!selectedDate) {
          return [];
      }

      const dailyTransactions = new Map<string, { stockIn: number; inStoreSales: number }>();

      inventoryLogs.forEach(log => {
          const logDate = formatDateToYMD(log.date);
          if (!logDate) return;

          if (logDate === selectedDate) {
              const key = `${log.productName}#${log.location}`;
              const current = dailyTransactions.get(key) || { stockIn: 0, inStoreSales: 0 };
              if (log.transactionType === 'Stock In' || log.transactionType === 'Initial Stock') {
                  current.stockIn += log.quantity;
              } else if (log.transactionType === 'In-Store Sale') {
                  current.inStoreSales += log.quantity;
              }
              dailyTransactions.set(key, current);
          }
      });

      const data: DailySummaryData[] = [];
      
      dailyTransactions.forEach((todaysMoves, key) => {
          const [productName, location] = key.split('#');

          if (selectedLocation !== 'All' && location !== selectedLocation) {
              return;
          }
          
          if (todaysMoves.stockIn === 0 && todaysMoves.inStoreSales === 0) {
              return;
          }

          data.push({
              productName,
              location,
              stockIn: todaysMoves.stockIn,
              inStoreSales: Math.abs(todaysMoves.inStoreSales),
          });
      });

      return data.sort((a,b) => a.productName.localeCompare(b.productName) || a.location.localeCompare(b.location));

  }, [selectedDate, selectedLocation, inventoryLogs]);
  
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
      >
        {label}
      </button>
    );
  };
  
  if (loading) {
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Stock & Sales View</h2>
            <p>Loading data...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Stock & Sales View</h2>

      <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {renderTabButton('locations', 'Locations Stock')}
              {renderTabButton('warehouse', 'Warehouse Stock')}
              {renderTabButton('summary', 'Daily Summary Report')}
          </nav>
      </div>
      
      {activeTab === 'locations' && (
        <div className="space-y-4 pt-4">
            {Object.keys(groupedStock).length > 0 ? Object.entries(groupedStock).map(([location, products]) => (
            <details key={location} className="bg-white shadow-lg rounded-xl overflow-hidden group transition-all duration-300">
                <summary className="px-6 py-4 text-xl font-semibold text-gray-800 cursor-pointer list-none flex justify-between items-center hover:bg-gray-50 transition-colors">
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

    {activeTab === 'warehouse' && (
        <div className="space-y-4 pt-4">
            {/* FIX: Removed casting to unknown and use Object.entries on warehouseStock directly, then cast for the map */}
            {Object.keys(warehouseStock as any).length > 0 ? (Object.entries(warehouseStock as any) as [string, WarehouseStockProduct[]][]).map(([category, products]) => (
            <details key={category} className="bg-white shadow-md rounded-xl overflow-hidden group transition-all duration-300">
                <summary className="px-6 py-4 text-xl font-bold text-gray-800 cursor-pointer list-none flex justify-between items-center bg-gray-100 hover:bg-gray-200 transition-colors">
                    <span>{category}</span>
                    <span className="text-indigo-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform transition-transform duration-200 group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </span>
                </summary>
                <div className="p-2 space-y-2 bg-gray-50">
                    {/* FIX: Explicitly type product in map callback */}
                    {products.map((product: WarehouseStockProduct) => (
                        <details key={product.productName} className="bg-white shadow-lg rounded-xl overflow-hidden group/product transition-all duration-300">
                            <summary className="px-6 py-4 text-lg font-semibold text-gray-800 cursor-pointer list-none flex justify-between items-center hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <span className="text-indigo-700">{product.productName}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                     <span className="text-gray-500 text-base font-normal">({product.totalStock} units / {product.colors.length} colors)</span>
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
                                        {product.totalStock}
                                    </span>
                                </div>
                                {/* FIX: Add specific type for item to resolve 'any' type. */}
                                {product.colors.map((item: { color: string; quantity: number }) => {
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

      {activeTab === 'summary' && (
        <div className="space-y-6 pt-4">
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
                    <DatePicker label="Report Date" value={selectedDate} onChange={setSelectedDate} allowClear={false} />
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

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock In (+)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In-Store Sales (SOLD)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {summaryData.length > 0 ? summaryData.map((row, index) => (
                            <tr key={index} className="odd:bg-white even:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.productName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">{row.stockIn > 0 ? `+${row.stockIn}`: row.stockIn}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">{row.inStoreSales}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                  <LocationTag location={row.location} />
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="text-center py-10 text-gray-500">
                                    No data available for the selected filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
              </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CurrentStockView;
