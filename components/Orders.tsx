import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LocationOrder, Location, User } from '../types';
import { getLocationOrders, getLocations, getUsers, formatDateToYMD, formatToLocaleString } from '../services/dataService';
import { updateOrderStatus } from '../services/writeService';
import LocationTag from './LocationTag';
import DatePicker from './DatePicker';
import Modal from './Modal';
import { MinusIcon, PlusIcon, ChevronDownIcon, PencilIcon, CheckCircleIcon, XIcon, ArrowUpTrayIcon } from './icons';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const statusStyles: Record<string, string> = {
        'Pending': 'bg-yellow-100 text-yellow-800',
        'Pickup': 'bg-blue-100 text-blue-800',
        'Partial': 'bg-orange-100 text-orange-800',
    };
    const style = statusStyles[status] || 'bg-gray-100 text-gray-800';
    return <span className={`px-3 py-1.5 text-sm leading-5 font-semibold rounded-full ${style}`}>{status || 'Pending'}</span>;
};


const Orders: React.FC = () => {
  const [orders, setOrders] = useState<LocationOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // State for filters and data for dropdowns
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  
  const [isUserDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isLocationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  // State for editing modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<LocationOrder | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [newOfficeNotes, setNewOfficeNotes] = useState('');
  const [newQuantity, setNewQuantity] = useState<number | string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [submittingQuickAction, setSubmittingQuickAction] = useState<{ orderID: string; type: string } | null>(null);

  // State for bulk selection
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [shareStatus, setShareStatus] = useState('');


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ordersData, locationsData, usersData] = await Promise.all([
          getLocationOrders(),
          getLocations(),
          getUsers(),
        ]);
        setOrders(ordersData);
        setLocations(locationsData);
        setUsers(usersData);
      } catch (error) {
        console.error("Failed to fetch orders data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
            setUserDropdownOpen(false);
        }
        if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
            setLocationDropdownOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const groupedAndFilteredOrders = useMemo(() => {
    const filtered = orders.filter(order => {
      const dateMatch = !selectedDate || formatDateToYMD(order.timestamp) === selectedDate;
      const userMatch = selectedUser === 'All' || (order.userName || '').trim() === selectedUser.trim();
      const locationMatch = selectedLocation === 'All' || order.location === selectedLocation;
      
      return dateMatch && userMatch && locationMatch;
    });

    const grouped: Record<string, Record<string, LocationOrder[]>> = {};

    filtered.forEach(order => {
        const location = order.location || 'Unassigned';
        const orderDate = formatDateToYMD(order.timestamp);
        if (!orderDate) return;

        if (!grouped[location]) {
            grouped[location] = {};
        }
        if (!grouped[location][orderDate]) {
            grouped[location][orderDate] = [];
        }
        grouped[location][orderDate].push(order);
    });
    
    // Sort locations alphabetically, and dates within locations chronologically
    return Object.keys(grouped).sort().reduce(
        (obj, locationKey) => {
            const dates = grouped[locationKey];
            const sortedDates: Record<string, LocationOrder[]> = {};
            Object.keys(dates).sort().reverse().forEach(dateKey => { // Sort dates descending
                sortedDates[dateKey] = dates[dateKey].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Sort orders within date descending
            });
            obj[locationKey] = sortedDates;
            return obj;
        }, 
        {} as Record<string, Record<string, LocationOrder[]>>
    );

  }, [orders, selectedDate, selectedUser, selectedLocation]);
  
  // Auto-expand all location and date groups by default
  useEffect(() => {
    const allLocationKeys = new Set<string>();
    const allDateKeys = new Set<string>();
    
    Object.entries(groupedAndFilteredOrders).forEach(([location, ordersByDate]) => {
      allLocationKeys.add(location);
      Object.keys(ordersByDate).forEach(date => {
        allDateKeys.add(`${location}-${date}`);
      });
    });

    setExpandedLocations(allLocationKeys);
    setExpandedDates(allDateKeys);
  }, [groupedAndFilteredOrders]);

  const handleToggleLocation = (location: string, isOpen: boolean) => {
    setExpandedLocations(prev => {
        const newSet = new Set(prev);
        if (isOpen) {
            newSet.add(location);
        } else {
            newSet.delete(location);
        }
        return newSet;
    });
  };

  const handleToggleDate = (e: React.MouseEvent, dateKey: string) => {
    e.preventDefault();
    setExpandedDates(prev => {
        const newSet = new Set(prev);
        if (newSet.has(dateKey)) newSet.delete(dateKey);
        else newSet.add(dateKey);
        return newSet;
    });
  };

  const handleToggleItem = (e: React.MouseEvent, itemKey: string) => {
    e.preventDefault();
    setExpandedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(itemKey)) newSet.delete(itemKey);
        else newSet.add(itemKey);
        return newSet;
    });
  };


  const clearFilters = () => {
    setSelectedDate('');
    setSelectedUser('All');
    setSelectedLocation('All');
  };

  const handleOpenEditModal = (order: LocationOrder) => {
    setEditingOrder(order);
    setNewStatus(order.status || 'Pending');
    setNewOfficeNotes(order.officeNotes || '');
    setNewQuantity(order.quantity);
    setSubmissionError('');
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingOrder(null);
  };

  const handleSaveChanges = async () => {
    if (!editingOrder) return;
    setIsSubmitting(true);
    setSubmissionError('');

    const payload: { orderID: string; status: string; officeNotes: string; quantity?: number } = {
        orderID: editingOrder.orderID,
        status: newStatus,
        officeNotes: newOfficeNotes,
    };

    if (newStatus === 'Partial') {
        const qty = typeof newQuantity === 'string' ? parseInt(newQuantity, 10) : newQuantity;
        if (isNaN(qty) || qty < 0) {
            setSubmissionError('Please enter a valid quantity.');
            setIsSubmitting(false);
            return;
        }
        payload.quantity = qty;
    }

    const result = await updateOrderStatus(payload);

    if (result.success) {
      setOrders(prevOrders => prevOrders.map(o => {
        if (o.orderID === editingOrder.orderID) {
          return { 
            ...o, 
            status: newStatus, 
            officeNotes: newOfficeNotes,
            quantity: newStatus === 'Partial' ? (payload.quantity ?? o.quantity) : o.quantity
          };
        }
        return o;
      }));
      handleCloseEditModal();
    } else {
      setSubmissionError(result.message);
    }
    setIsSubmitting(false);
  };

  const handleQuickStatusUpdate = async (order: LocationOrder, status: string) => {
    setSubmittingQuickAction({ orderID: order.orderID, type: status });
    setSubmissionError('');

    const result = await updateOrderStatus({
        orderID: order.orderID,
        status: status,
        officeNotes: order.officeNotes, // Preserve existing notes
    });

    if (result.success) {
        setOrders(prevOrders => prevOrders.map(o =>
            o.orderID === order.orderID
                ? { ...o, status: status }
                : o
        ));
    } else {
        alert(`Failed to quick-update order: ${result.message}`);
    }
    setSubmittingQuickAction(null);
  };
  
    // --- Bulk Selection Handlers ---
    const handleToggleSelection = (orderId: string) => {
        const newSelection = new Set(selectedOrders);
        if (newSelection.has(orderId)) {
            newSelection.delete(orderId);
        } else {
            newSelection.add(orderId);
        }
        setSelectedOrders(newSelection);
    };

    const handleSelectDateGroup = (ordersInGroup: LocationOrder[]) => {
        const orderIdsInGroup = ordersInGroup.map(o => o.orderID);
        const allSelected = orderIdsInGroup.length > 0 && orderIdsInGroup.every(id => selectedOrders.has(id));
        
        const newSelection = new Set(selectedOrders);
        if (allSelected) {
            orderIdsInGroup.forEach(id => newSelection.delete(id));
        } else {
            orderIdsInGroup.forEach(id => newSelection.add(id));
        }
        setSelectedOrders(newSelection);
    };

    const handleBulkMarkAsPickup = async () => {
        setIsBulkSubmitting(true);
        const promises = Array.from(selectedOrders).map(orderID => {
            const order = orders.find(o => o.orderID === orderID);
            if (!order || order.status === 'Pickup') return Promise.resolve({ success: true, message: 'Skipped' });
            return updateOrderStatus({
                orderID: order.orderID,
                status: 'Pickup',
                officeNotes: order.officeNotes,
            });
        });

        const results = await Promise.allSettled(promises);
        const successfullyUpdatedIds = [];
        const failedUpdates = [];

        results.forEach((result, index) => {
            const orderId = Array.from(selectedOrders)[index];
            if (result.status === 'fulfilled' && result.value.success) {
                successfullyUpdatedIds.push(orderId);
            } else if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)) {
                failedUpdates.push(orderId);
            }
        });

        if (successfullyUpdatedIds.length > 0) {
            setOrders(prevOrders => prevOrders.map(o =>
                successfullyUpdatedIds.includes(o.orderID) ? { ...o, status: 'Pickup' } : o
            ));
        }

        if (failedUpdates.length > 0) {
            alert(`Failed to update ${failedUpdates.length} orders. Please check their status and try again.`);
        }

        setSelectedOrders(new Set());
        setIsBulkSubmitting(false);
    };

    const handleShareSelection = async () => {
        const selectedOrderObjects = orders.filter(o => selectedOrders.has(o.orderID));
        if (selectedOrderObjects.length === 0) return;

        // Group by location
        const groupedByLocation = selectedOrderObjects.reduce((acc, order) => {
            const location = order.location || 'Unassigned';
            if (!acc[location]) {
                acc[location] = [];
            }
            acc[location].push(order);
            return acc;
        }, {} as Record<string, LocationOrder[]>);

        let textToCopy = '*Order Request*\n\n';

        for (const location of Object.keys(groupedByLocation).sort()) {
            textToCopy += `*📍 ${location}*\n`;
            
            const ordersInLocation = groupedByLocation[location];
            
            ordersInLocation
                .sort((a, b) => a.item.localeCompare(b.item))
                .forEach(order => {
                    textToCopy += `- ${order.quantity} x *${order.item}*`;
                    if (order.colors) {
                        textToCopy += ` (${order.colors})`;
                    }
                    textToCopy += '\n';
                    if (order.notes && order.notes.trim()) {
                        textToCopy += `  _Note: ${order.notes.trim()}_\n`;
                    }
                });
            textToCopy += '\n';
        }

        try {
            await navigator.clipboard.writeText(textToCopy.trim());
            setShareStatus('Copied to clipboard!');
            setTimeout(() => setShareStatus(''), 2500);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            setShareStatus('Copy failed!');
            setTimeout(() => setShareStatus(''), 2500);
        }
    };


  if (loading) {
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Location Orders</h2>
            <p>Loading orders...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <h2 className="text-3xl font-bold text-gray-900">Location Orders</h2>

      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="mb-4">
            <DatePicker label="Filter by Date" value={selectedDate} onChange={setSelectedDate} />
        </div>

        <details className="group">
            <summary className="list-none cursor-pointer inline-flex items-center p-2 rounded-md hover:bg-gray-100 text-sm font-medium text-gray-700">
                <span>More Filters</span>
                <ChevronDownIcon className="ml-1 h-5 w-5 transition-transform duration-200 group-open:rotate-180" />
            </summary>

            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                {/* User Filter Dropdown */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">User</label>
                    <div className="relative mt-1" ref={userDropdownRef}>
                        <button
                            onClick={() => setUserDropdownOpen(!isUserDropdownOpen)}
                            className="inline-flex justify-between w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <span>{selectedUser === 'All' ? 'All Users' : selectedUser}</span>
                            <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" />
                        </button>
                        {isUserDropdownOpen && (
                            <div className="origin-top-right absolute right-0 mt-2 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 max-h-60 overflow-y-auto">
                                <div className="py-1" role="menu" aria-orientation="vertical">
                                    <button onClick={() => { setSelectedUser('All'); setUserDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">All Users</button>
                                    {users.map(user => (
                                        <button key={user.userID} onClick={() => { setSelectedUser(user.name); setUserDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">{user.name}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* Location Filter Dropdown */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <div className="relative mt-1" ref={locationDropdownRef}>
                        <button
                            onClick={() => setLocationDropdownOpen(!isLocationDropdownOpen)}
                            className="inline-flex justify-between w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <span>{selectedLocation === 'All' ? 'All Locations' : selectedLocation}</span>
                            <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" />
                        </button>
                        {isLocationDropdownOpen && (
                            <div className="origin-top-right absolute right-0 mt-2 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 max-h-60 overflow-y-auto">
                                <div className="py-1" role="menu" aria-orientation="vertical">
                                    <button onClick={() => { setSelectedLocation('All'); setLocationDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">All Locations</button>
                                    {locations.map(loc => (
                                        <button key={loc.id} onClick={() => { setSelectedLocation(loc.name); setLocationDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">{loc.name}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
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
        </details>
      </div>

      <div className="space-y-3">
        {Object.keys(groupedAndFilteredOrders).length > 0 ? (
          Object.entries(groupedAndFilteredOrders).map(([location, ordersByDate]) => (
            <details 
                key={location} 
                open={expandedLocations.has(location)} 
                onToggle={(e) => handleToggleLocation(location, (e.target as HTMLDetailsElement).open)}
                className="bg-white shadow rounded-lg transition-all duration-300 group"
            >
                <summary className="px-4 py-3 text-lg font-semibold text-gray-800 cursor-pointer list-none flex justify-between items-center hover:bg-gray-50 rounded-t-lg">
                    <div className="flex items-center gap-3">
                        <LocationTag location={location} />
                        <span className="text-gray-600 text-base font-normal">({Object.values(ordersByDate).flat().length} items)</span>
                    </div>
                    <span className="text-indigo-600">
                      <PlusIcon className="h-6 w-6 block group-open:hidden" />
                      <MinusIcon className="h-6 w-6 hidden group-open:block" />
                    </span>
                </summary>

                <div className="border-t border-gray-200 pt-0 p-2 md:p-4 space-y-4">
                  {Object.keys(ordersByDate).sort().reverse().map(date => {
                    const ordersForDay = ordersByDate[date];
                    const orderIdsForDay = ordersForDay.map(o => o.orderID);
                    const areAllSelected = orderIdsForDay.length > 0 && orderIdsForDay.every(id => selectedOrders.has(id));
                    const areSomeSelected = orderIdsForDay.some(id => selectedOrders.has(id));
                    
                    const dateKey = `${location}-${date}`;
                    const formattedDate = new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
                        weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC'
                    });
                    
                    const itemsGroupedByName = ordersForDay.reduce((acc, order) => {
                        const key = order.item;
                        if (!acc[key]) {
                            acc[key] = { totalQuantity: 0, details: [] };
                        }
                        acc[key].totalQuantity += order.quantity;
                        acc[key].details.push(order);
                        return acc;
                    }, {} as Record<string, { totalQuantity: number; details: LocationOrder[] }>);

                    return (
                      <details key={dateKey} open={expandedDates.has(dateKey)} className="pl-4 border-l-2 border-indigo-200 group/date">
                          <summary className="font-semibold text-gray-700 text-md list-none cursor-pointer -ml-4 pl-3 bg-gray-200/50 py-1 rounded-r-md flex justify-between items-center" onClick={(e) => handleToggleDate(e, dateKey)}>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    className="form-checkbox h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                    checked={areAllSelected}
                                    ref={el => { if(el) el.indeterminate = areSomeSelected && !areAllSelected; }}
                                    onChange={() => handleSelectDateGroup(ordersForDay)}
                                    onClick={e => e.stopPropagation()} // Prevent summary click from toggling
                                    aria-label={`Select all orders for ${formattedDate}`}
                                />
                                <span>{formattedDate}</span>
                            </div>
                            <ChevronDownIcon className="h-5 w-5 mr-2 text-gray-500 transform transition-transform duration-200 group-open/date:rotate-180" />
                          </summary>
                          <div className="space-y-3 mt-3">
                            {/* FIX: Add explicit type casting for Object.entries to resolve 'unknown' type errors in TypeScript. */}
                            {(Object.entries(itemsGroupedByName) as [string, { totalQuantity: number; details: LocationOrder[] }][])
                              .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
                              .map(([itemName, group]) => {
                                const itemKey = `${dateKey}-${itemName}`;
                                return (
                                  <details key={itemKey} open={expandedItems.has(itemKey)} className="bg-white border rounded-lg shadow-sm group/item">
                                      <summary className="p-3 flex justify-between items-start list-none cursor-pointer" onClick={(e) => handleToggleItem(e, itemKey)}>
                                          <div>
                                              <h5 className="font-bold text-indigo-700">{itemName}</h5>
                                              <p className="text-xs text-gray-500 mt-1">
                                                Latest order: {(formatToLocaleString(group.details[0].timestamp) || ' ').split(', ')[1]}
                                              </p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="px-2 py-1 text-xs font-semibold leading-5 rounded-full bg-indigo-100 text-indigo-800 flex-shrink-0">
                                                Total Qty: {group.totalQuantity}
                                            </span>
                                            <ChevronDownIcon className="h-5 w-5 text-gray-500 transform transition-transform duration-200 group-open/item:rotate-180" />
                                          </div>
                                      </summary>
                                      <div className="mt-3 pl-4 border-l-2 border-gray-200 space-y-2 p-3 border-t">
                                          {group.details.map(order => {
                                            const isSubmittingThisAction = (type: string) => submittingQuickAction?.orderID === order.orderID && submittingQuickAction?.type === type;
                                            const isAnythingSubmitting = !!submittingQuickAction;

                                            return (
                                                <div key={order.orderID} className="border-t pt-2 mt-2 first:border-t-0 first:mt-0 first:pt-0">
                                                    <div className="flex items-start gap-3">
                                                        <input
                                                            type="checkbox"
                                                            className="form-checkbox h-5 w-5 text-indigo-600 rounded border-gray-300 mt-1 flex-shrink-0"
                                                            checked={selectedOrders.has(order.orderID)}
                                                            onChange={() => handleToggleSelection(order.orderID)}
                                                            aria-labelledby={`order-info-${order.orderID}`}
                                                        />
                                                        <div id={`order-info-${order.orderID}`} className="flex-1">
                                                            <div className="flex justify-between items-center flex-wrap gap-x-4 gap-y-2">
                                                                <p className="text-gray-700 text-base">
                                                                {order.colors && <>{order.colors} - </>}
                                                                <span className="font-semibold">{order.quantity} units</span>
                                                                <span className="text-gray-500 italic text-sm"> by {order.userName || order.createdBy}</span>
                                                                </p>
                                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                                <StatusBadge status={order.status} />
                                                                <button onClick={() => handleQuickStatusUpdate(order, 'Pickup')} className="p-2 text-blue-500 hover:text-blue-700 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" aria-label={`Mark order ${order.orderID} as picked up`} disabled={isAnythingSubmitting || order.status === 'Pickup' || selectedOrders.size > 0}>
                                                                    {isSubmittingThisAction('Pickup') ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div> : <CheckCircleIcon className="h-6 w-6" />}
                                                                </button>
                                                                <button onClick={() => handleOpenEditModal(order)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-gray-100 disabled:opacity-50" aria-label={`Edit order ${order.orderID}`} disabled={isAnythingSubmitting || selectedOrders.size > 0}>
                                                                    <PencilIcon className="h-5 w-5" />
                                                                </button>
                                                                </div>
                                                            </div>
                                                            {order.officeNotes && (
                                                                <p className="text-sm italic mt-1 bg-gray-50 p-2 rounded-md">
                                                                    <strong className="text-gray-600">Office Note:</strong> <span className="text-red-600 font-semibold">{order.officeNotes}</span>
                                                                </p>
                                                            )}
                                                            {order.notes && (
                                                                <p className="text-sm text-gray-600 italic mt-1">
                                                                &quot;{order.notes}&quot;
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                          })}
                                      </div>
                                  </details>
                              );
                              })}
                          </div>
                      </details>
                    )
                  })}
                </div>
            </details>
          ))
        ) : (
          <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow">
            <p>No orders match the current filters.</p>
          </div>
        )}
      </div>
      
      <Modal isOpen={isEditModalOpen} onClose={handleCloseEditModal} title={`Edit Order: ${editingOrder?.item}`}>
        {editingOrder && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Editing order for <span className="font-semibold">{editingOrder.quantity} units</span> of <span className="font-semibold">{editingOrder.item}</span>{editingOrder.colors ? ` (${editingOrder.colors})` : ''}.
            </p>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
              <select
                id="status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option>Pending</option>
                <option>Pickup</option>
                <option>Partial</option>
              </select>
            </div>
             {newStatus === 'Partial' && (
                <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Update Quantity</label>
                    <input
                        id="quantity"
                        type="number"
                        value={newQuantity}
                        onChange={(e) => setNewQuantity(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                        placeholder={`Original: ${editingOrder.quantity}`}
                    />
                    <p className="text-xs text-gray-500 mt-1">Update the quantity for this partial order.</p>
                </div>
            )}
            <div>
              <label htmlFor="office-notes" className="block text-sm font-medium text-gray-700">Office Notes</label>
              <textarea
                id="office-notes"
                value={newOfficeNotes}
                onChange={(e) => setNewOfficeNotes(e.target.value)}
                rows={4}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Add internal notes for the logistics team..."
              />
            </div>
            {submissionError && <p className="text-sm text-red-600">{submissionError}</p>}
            <div className="flex justify-end pt-2 space-x-3">
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSubmitting}
                className="bg-indigo-600 text-white px-6 py-2 rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>
      
      {selectedOrders.size > 0 && (
        <div className="fixed bottom-0 md:bottom-4 inset-x-0 p-4 z-20 flex justify-center">
            <div className="bg-white/90 backdrop-blur-lg shadow-2xl rounded-xl p-3 flex items-center justify-between gap-4 w-full max-w-lg border border-gray-200">
                {shareStatus ? (
                    <p className="text-sm font-medium text-green-600 flex-1 text-center">{shareStatus}</p>
                ) : (
                    <p className="text-sm font-medium text-gray-700">
                        <span className="font-bold text-indigo-600">{selectedOrders.size}</span> item(s) selected
                    </p>
                )}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleShareSelection}
                        className="px-3 py-2 text-sm font-semibold text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 flex items-center gap-2"
                        aria-label="Share selection"
                    >
                        <ArrowUpTrayIcon className="h-5 w-5" />
                        <span>Share</span>
                    </button>
                    <button 
                        onClick={handleBulkMarkAsPickup}
                        disabled={isBulkSubmitting}
                        className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
                    >
                        {isBulkSubmitting ? 'Updating...' : 'Mark as Pickup'}
                    </button>
                    <button
                        onClick={() => setSelectedOrders(new Set())}
                        className="p-2 text-gray-500 hover:bg-gray-200 rounded-full"
                        aria-label="Clear selection"
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Orders;