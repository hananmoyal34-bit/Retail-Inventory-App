

import React, { useState, useEffect, useMemo } from 'react';
import { ShippingData, Location, User } from '../types';
import { getShippingData, formatToLocaleString } from '../services/dataService';
import { ArrowUpTrayIcon } from './icons';

interface ShippingProps {
    currentUser: User;
    allLocations: Location[];
}

const Shipping: React.FC<ShippingProps> = ({ currentUser, allLocations }) => {
    const [shippingData, setShippingData] = useState<ShippingData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLocationFilter, setSelectedLocationFilter] = useState('All');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const userLocationShortNames = useMemo(() => {
        return currentUser.location ? currentUser.location.split(',').map(l => l.trim()).filter(Boolean) : [];
    }, [currentUser.location]);
    
    const userLocationFullNames = useMemo(() => {
        const fullNames = new Set<string>();
        const userLocationsMap = new Map(allLocations.map(l => [l.name, l.locationFullName]));
        userLocationShortNames.forEach(shortName => {
            const fullName = userLocationsMap.get(shortName);
            // FIX: Using a more explicit type guard to ensure `fullName` is a string, resolving potential linter issues.
            if (typeof fullName === 'string') {
                fullNames.add(fullName);
            }
        });
        return Array.from(fullNames);
    }, [userLocationShortNames, allLocations]);
    
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await getShippingData();
                // Filter data to only include shipments for the user's locations
                const userSpecificData = data.filter((shipment: ShippingData) => userLocationFullNames.includes(shipment.storeName));
                setShippingData(userSpecificData);
            } catch (error) {
                console.error("Failed to fetch shipping data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userLocationFullNames]);
    
    const filteredAndSortedData = useMemo(() => {
        let data = [...shippingData];

        if (selectedLocationFilter !== 'All') {
            data = data.filter(item => item.storeName === selectedLocationFilter);
        }

        data.sort((a, b) => {
            const dateA = new Date(a.timestamp).getTime();
            const dateB = new Date(b.timestamp).getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        return data;
    }, [shippingData, selectedLocationFilter, sortOrder]);
    
    const toggleSortOrder = () => {
        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4 border-b pb-2">Shipments (Last 7 Days)</h3>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:space-x-4 gap-4">
                <div className="flex-1 max-w-xs">
                    <label htmlFor="location-filter-shipping" className="block text-sm font-medium text-gray-700">Filter by Store</label>
                    <select
                        id="location-filter-shipping"
                        value={selectedLocationFilter}
                        onChange={(e) => setSelectedLocationFilter(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                        <option value="All">All My Stores</option>
                        {userLocationFullNames.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                </div>
                 <div className="md:hidden">
                    <label htmlFor="sort-order-shipping" className="block text-sm font-medium text-gray-700">Sort by Date</label>
                    <button onClick={toggleSortOrder} className="mt-1 w-full justify-center flex items-center px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm">
                        {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
                        <span className="ml-2">{sortOrder === 'desc' ? '▼' : '▲'}</span>
                    </button>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <button onClick={toggleSortOrder} className="flex items-center font-medium">
                                    Timestamp
                                    <span className="ml-1">{sortOrder === 'desc' ? '▼' : '▲'}</span>
                                </button>
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order No.</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store Rep Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acknowledgment Receipt</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredAndSortedData.length > 0 ? filteredAndSortedData.map((item, index) => (
                            <tr key={item.orderNo + index} className="odd:bg-white even:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatToLocaleString(item.timestamp)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.storeName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.orderNo}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.storeRepName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{`${item.firstName} ${item.lastName}`.trim()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                    {item.ackReceiptUrl ? (
                                        <a href={item.ackReceiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                                            View Receipt
                                        </a>
                                    ) : (
                                        <span className="text-gray-500">No Receipt</span>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="text-center py-10 text-gray-500">
                                    No shipping records found for your locations in the past 7 days.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {filteredAndSortedData.length > 0 ? filteredAndSortedData.map((item, index) => (
                    <div key={item.orderNo + index} className="bg-white p-4 rounded-lg shadow-sm border">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-gray-800">{item.storeName}</h4>
                                <p className="text-xs text-gray-500">{formatToLocaleString(item.timestamp)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{item.orderNo}</p>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t text-sm space-y-1">
                            <p><span className="font-medium text-gray-600">Rep:</span> {item.storeRepName}</p>
                            <p><span className="font-medium text-gray-600">Customer:</span> {`${item.firstName} ${item.lastName}`.trim()}</p>
                        </div>
                        <div className="mt-4">
                            {item.ackReceiptUrl ? (
                                <a href={item.ackReceiptUrl} target="_blank" rel="noopener noreferrer" className="w-full flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                                    <ArrowUpTrayIcon className="h-4 w-4 mr-2 transform -rotate-45" /> View Receipt
                                </a>
                            ) : (
                                <p className="text-center text-sm text-gray-500 bg-gray-100 p-2 rounded-md">No Receipt Available</p>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">
                        <p>No shipping records found for your locations in the past 7 days.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Shipping;