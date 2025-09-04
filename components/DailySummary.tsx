import React, { useState, useMemo, useEffect } from 'react';
import { getInventoryLogs, getLocations, formatDateToYMD, getCurrentDateInTimezone } from '../services/dataService';
import { InventoryLog, Location } from '../types';
import LocationTag from './LocationTag';
import DatePicker from './DatePicker';

interface DailySummaryData {
    productName: string;
    location: string;
    stockIn: number;
    inStoreSales: number;
}


const DailySummary: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState(getCurrentDateInTimezone());
    const [selectedLocation, setSelectedLocation] = useState<string>('All');
    const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [logsData, locationsData] = await Promise.all([
                    getInventoryLogs(),
                    getLocations(),
                ]);
                setInventoryLogs(logsData);
                setLocations(locationsData);
            } catch (error) {
                console.error("Failed to fetch data for daily summary", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

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

    if (loading) {
        return (
            <div className="space-y-6">
                <h2 className="text-3xl font-bold text-gray-900">Daily Summary Report</h2>
                <p>Loading summary data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Daily Summary Report</h2>

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
    );
};

export default DailySummary;