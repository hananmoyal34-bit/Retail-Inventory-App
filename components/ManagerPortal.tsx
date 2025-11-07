
import React, { useState, useEffect, useMemo } from 'react';
import { User, Product, OrderItem, OrderPayload, Location, LocationOrder, AppSheetProduct, UpdateOrderPayload } from '../types';
import { getUsers, getProducts, getLocations, getLocationOrders, formatToLocaleString, getAppSheetProducts, formatDateToYMD } from '../services/dataService';
import { submitOrder, updateOrder, deleteOrder } from '../services/writeService';
import { PlusIcon, SearchIcon, TrashIcon, MinusIcon, ChevronDownIcon, CheckCircleIcon, PencilIcon } from './icons';
import Shipping from './Shipping';
import LocationTag from './LocationTag';
import AccessibleNumberInput from './AccessibleNumberInput';
import Modal from './Modal';
import Tooltip from './Tooltip';
import ConfirmationModal from './customer_service_hub/components/ConfirmationModal';

interface ManagerPortalProps {
    user: User;
    onLogout: () => void;
}

const SmallStatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const statusStyles: Record<string, string> = {
        'Pending': 'bg-yellow-100 text-yellow-800',
        'Pickup': 'bg-blue-100 text-blue-800',
        'Partial': 'bg-orange-100 text-orange-800',
        'Delivered': 'bg-green-100 text-green-800',
        'Out of Stock': 'bg-red-100 text-red-800',
    };
    const style = statusStyles[status] || 'bg-gray-100 text-gray-800';
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${style}`}>{status || 'Pending'}</span>;
};


const ManagerPortal: React.FC<ManagerPortalProps> = ({ user, onLogout }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('createOrder');

    // Order Form State
    const [appSheetProducts, setAppSheetProducts] = useState<AppSheetProduct[]>([]);
    const [allLocations, setAllLocations] = useState<Location[]>([]);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    
    // Form input states
    const [selectedAppSheetProduct, setSelectedAppSheetProduct] = useState<AppSheetProduct | null>(null);
    const [orderProductQuantity, setOrderProductQuantity] = useState(1);
    const [orderProductColor, setOrderProductColor] = useState('');
    const [orderProductNotes, setOrderProductNotes] = useState('');
    const [showProductNotes, setShowProductNotes] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // State for multi-color item staging
    const [stagedItemsForProduct, setStagedItemsForProduct] = useState<OrderItem[]>([]);
    const [activeColor, setActiveColor] = useState('');
    const [activeColorQuantity, setActiveColorQuantity] = useState(1);
    
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [expandedSubCategories, setExpandedSubCategories] = useState<Set<string>>(new Set());
    
    const [customItemName, setCustomItemName] = useState('');
    const [customItemQuantity, setCustomItemQuantity] = useState(1);
    const [customItemNotes, setCustomItemNotes] = useState('');
    const [showCustomItemNotes, setShowCustomItemNotes] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

    // State for My Orders tab
    const [allLocationOrders, setAllLocationOrders] = useState<LocationOrder[]>([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<LocationOrder | null>(null);
    const [editFormState, setEditFormState] = useState<UpdateOrderPayload | null>(null);
    const [editModalError, setEditModalError] = useState<string | null>(null);

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            const [locationsData, ordersData, appSheetData] = await Promise.all([
                getLocations(),
                getLocationOrders(),
                getAppSheetProducts(),
            ]);
            setAllLocations(locationsData);
            setAllLocationOrders(ordersData);
            setAppSheetProducts(appSheetData);
        } catch (error) {
            console.error("Failed to initialize portal:", error);
        } finally {
            setIsLoading(false);
        }
    };


    useEffect(() => {
        fetchAllData();
    }, []);

    const handleToggleLocation = (locationName: string) => {
        setSelectedLocations(prev =>
            prev.includes(locationName)
                ? prev.filter(l => l !== locationName)
                : [...prev, locationName]
        );
    };

    const handleSelectProductForOrder = (product: AppSheetProduct) => {
        setSelectedAppSheetProduct(product);
        // Reset states for the new selection
        setOrderProductQuantity(1); // For single-color items
        setOrderProductNotes('');
        setShowProductNotes(false);
        setStagedItemsForProduct([]); // Clear stage
        setActiveColor(''); // Clear active color
        setActiveColorQuantity(1);

        // If there's only one color, auto-select it for the single-color UI
        setOrderProductColor(product.colors.length === 1 ? product.colors[0] : '');
    };
    
    const handleSetActiveColor = (color: string) => {
        setActiveColor(color);
        setActiveColorQuantity(1); // Reset quantity when a new color is selected
    };

    const handleStageItem = () => {
        if (!selectedAppSheetProduct || !activeColor || activeColorQuantity < 1) return;
        if (stagedItemsForProduct.some(item => item.color === activeColor)) return; // Already staged

        const newItem: OrderItem = {
            type: 'product',
            id: `staged-${selectedAppSheetProduct.name}-${activeColor}-${new Date().getTime()}`, // Temp ID
            name: selectedAppSheetProduct.name,
            quantity: activeColorQuantity,
            color: activeColor,
            notes: '', // Notes are added at the end
        };
        setStagedItemsForProduct(prev => [...prev, newItem]);
        setActiveColor('');
        setActiveColorQuantity(1);
    };

    const handleRemoveStagedItem = (itemId: string) => {
        setStagedItemsForProduct(prev => prev.filter(item => item.id !== itemId));
    };

    const handleAddStagedItemsToOrder = () => {
        if (!selectedAppSheetProduct || stagedItemsForProduct.length === 0) return;

        const itemsWithNotes = stagedItemsForProduct.map(item => ({
            ...item,
            notes: orderProductNotes.trim(),
        }));

        setOrderItems(prev => [...prev, ...itemsWithNotes]);
        setSelectedAppSheetProduct(null);
        setSubmissionStatus({ type: null, message: '' });
    };

    const handleAddSingleItemToOrder = () => {
        if (!selectedAppSheetProduct || orderProductQuantity < 1) return;
        const newItem: OrderItem = {
            type: 'product',
            id: `${selectedAppSheetProduct.name}-${orderProductColor}-${new Date().getTime()}`,
            name: selectedAppSheetProduct.name,
            quantity: orderProductQuantity,
            color: orderProductColor.trim(),
            notes: orderProductNotes.trim(),
        };
        setOrderItems(prev => [...prev, newItem]);
        setSelectedAppSheetProduct(null);
        setSubmissionStatus({ type: null, message: '' });
    };
    
    const handleAddCustomItem = () => {
        if (!customItemName.trim() || customItemQuantity < 1) return;
        const newItem: OrderItem = {
            type: 'custom',
            id: `custom-${new Date().getTime()}`,
            name: customItemName.trim(),
            quantity: customItemQuantity,
            color: '',
            notes: customItemNotes.trim(),
        };
        setOrderItems(prev => [...prev, newItem]);
        setCustomItemName('');
        setCustomItemQuantity(1);
        setCustomItemNotes('');
        setShowCustomItemNotes(false);
    };

    const handleRemoveItem = (itemId: string) => {
        setOrderItems(prev => prev.filter(item => item.id !== itemId));
    };

    const handleSubmitOrder = async () => {
        if (selectedLocations.length === 0 || orderItems.length === 0) {
            setSubmissionStatus({ type: 'error', message: 'You must select at least one location and add at least one item to the order.'});
            return;
        }

        setIsSubmitting(true);
        setSubmissionStatus({ type: null, message: '' });

        const payload: OrderPayload = {
            userId: user.userID,
            userName: user.name,
            locations: selectedLocations,
            items: orderItems,
        };

        const result = await submitOrder(payload);

        if (result.success) {
            setSubmissionStatus({ type: 'success', message: result.message });
            // refetch orders to show the new one
            getLocationOrders().then(setAllLocationOrders);
        } else {
            setSubmissionStatus({ type: 'error', message: result.message });
        }
        setIsSubmitting(false);
    };

    const userOrders = useMemo(() => {
        if (!allLocationOrders) {
            return [];
        }

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        return allLocationOrders
            .filter(order => {
                if (order.createdBy !== user.userID) return false;
                try {
                    const orderDate = new Date(order.timestamp);
                    return !isNaN(orderDate.getTime()) && orderDate >= sevenDaysAgo;
                } catch (e) {
                    return false;
                }
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [user, allLocationOrders]);

    const groupedUserOrders = useMemo(() => {
        if (!userOrders) return {};

        const grouped: Record<string, Record<string, LocationOrder[]>> = {};

        userOrders.forEach(order => {
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

        return grouped;
    }, [userOrders]);
    
    const groupedProducts = useMemo(() => {
        const grouped: { [category: string]: { [subCategory: string]: AppSheetProduct[] } } = {};
        const lowercasedQuery = searchQuery.toLowerCase();

        appSheetProducts
            .filter(p => p.name.toLowerCase().includes(lowercasedQuery))
            .forEach(p => {
                const category = p.category || 'Uncategorized';
                const subCategory = p.subCategory || 'General';

                if (!grouped[category]) {
                    grouped[category] = {};
                }
                if (!grouped[category][subCategory]) {
                    grouped[category][subCategory] = [];
                }
                grouped[category][subCategory].push(p);
            });
        
        // Sort everything
        const sortedGrouped: { [category: string]: { [subCategory: string]: AppSheetProduct[] } } = {};
        Object.keys(grouped).sort().forEach(category => {
            sortedGrouped[category] = {};
            Object.keys(grouped[category]).sort().forEach(subCategory => {
                sortedGrouped[category][subCategory] = grouped[category][subCategory].sort((a, b) => a.name.localeCompare(b.name));
            });
        });

        return sortedGrouped;
    }, [appSheetProducts, searchQuery]);

    const groupedOrderItems = useMemo(() => {
        return orderItems.reduce((acc, item) => {
            const key = item.name;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(item);
            return acc;
        }, {} as Record<string, OrderItem[]>);
    }, [orderItems]);

    useEffect(() => {
        if (searchQuery) {
            const newExpandedCategories = new Set<string>();
            const newExpandedSubCategories = new Set<string>();
            Object.entries(groupedProducts).forEach(([category, subCategories]) => {
                newExpandedCategories.add(category);
                Object.keys(subCategories).forEach(subCategory => {
                    newExpandedSubCategories.add(`${category}|${subCategory}`);
                });
            });
            setExpandedCategories(newExpandedCategories);
            setExpandedSubCategories(newExpandedSubCategories);
        } else {
            setExpandedCategories(new Set());
            setExpandedSubCategories(new Set());
        }
    }, [searchQuery, groupedProducts]);

    const handleToggleCategory = (category: string, isOpen: boolean) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (isOpen) {
                newSet.add(category);
            } else {
                newSet.delete(category);
            }
            return newSet;
        });
    };
    
    const handleToggleSubCategory = (category: string, subCategory: string, isOpen: boolean) => {
        const key = `${category}|${subCategory}`;
        setExpandedSubCategories(prev => {
            const newSet = new Set(prev);
            if (isOpen) {
                newSet.add(key);
            } else {
                newSet.delete(key);
            }
            return newSet;
        });
    };

    const resetOrderForm = () => {
        setOrderItems([]);
        setSelectedLocations([]);
        setSubmissionStatus({ type: null, message: '' });
    };

    // --- Edit/Delete Handlers ---
    const openEditModal = (order: LocationOrder) => {
        setEditingOrder(order);
        setEditFormState({
            orderID: order.orderID,
            item: order.item,
            colors: order.colors,
            quantity: order.quantity,
            notes: order.notes,
        });
        setEditModalError(null);
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (order: LocationOrder) => {
        setEditingOrder(order);
        setIsDeleteModalOpen(true);
    };

    const handleUpdateOrder = async () => {
        if (!editFormState) return;
        setIsSubmitting(true);
        setEditModalError(null);
        const result = await updateOrder(editFormState);
        if (result.success) {
            showSuccessMessage('Order updated successfully!');
            await fetchAllData();
            setIsEditModalOpen(false);
        } else {
            setEditModalError(result.message);
        }
        setIsSubmitting(false);
    };
    
    const handleDeleteOrder = async () => {
        if (!editingOrder) return;
        setIsSubmitting(true);
        const result = await deleteOrder(editingOrder.orderID);
        if (result.success) {
            showSuccessMessage('Order deleted successfully!');
            await fetchAllData();
            setIsDeleteModalOpen(false);
        } else {
            alert(`Error: ${result.message}`);
        }
        setIsSubmitting(false);
    };
    
    const showSuccessMessage = (message: string) => {
        setSubmissionStatus({ type: 'success', message });
        setTimeout(() => setSubmissionStatus({ type: null, message: '' }), 4000);
    };
    // ----------------------------

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }
    
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

    const userLocations = user.location ? user.location.split(',').map(l => l.trim()).filter(Boolean) : [];

    return (
        <div className="min-h-screen font-sans text-gray-800 pb-24 md:pb-0">
             <header className="bg-white/70 backdrop-blur-lg shadow-sm sticky top-0 z-30">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Manager Portal</h1>
                            <p className="text-gray-600 text-sm">Welcome, {user.name}!</p>
                        </div>
                        <button
                            onClick={onLogout}
                            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md shadow-sm hover:bg-gray-300 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="space-y-6">
                 <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        {renderTabButton('createOrder', 'Create Order')}
                        {renderTabButton('myOrders', 'My Orders')}
                        {renderTabButton('shipments', 'Shipments')}
                    </nav>
                </div>
                
                 {submissionStatus.type === 'success' && activeTab !== 'createOrder' && (
                    <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4" role="alert">
                        <p>{submissionStatus.message}</p>
                    </div>
                )}


                <div className="pt-4">
                    {activeTab === 'createOrder' && (
                        submissionStatus.type === 'success' ? (
                            <div className="text-center p-8 bg-green-50 rounded-lg border border-green-200 max-w-lg mx-auto">
                                <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />
                                <h3 className="text-2xl font-bold text-green-800 mt-4">Success!</h3>
                                <p className="mt-2 text-green-700">{submissionStatus.message}</p>
                                <button 
                                    onClick={resetOrderForm} 
                                    className="mt-6 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
                                >
                                    Create Another Order
                                </button>
                            </div>
                        ) : (
                         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white p-6 rounded-lg shadow-md">
                                     <h3 className="text-xl font-semibold mb-4 border-b pb-2">Step 1: Select Locations</h3>
                                    <div className="space-y-4">
                                        {userLocations.length > 0 ? (
                                            <div className="space-y-2">
                                                <p className="text-sm text-gray-600 mb-2">Select which of your assigned locations this order is for.</p>
                                                {userLocations.map(location => (
                                                    <label key={location} className="flex items-center p-3 rounded-md hover:bg-gray-100 transition-colors cursor-pointer border">
                                                        <input
                                                            type="checkbox"
                                                            className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                            checked={selectedLocations.includes(location)}
                                                            onChange={() => handleToggleLocation(location)}
                                                        />
                                                        <span className="ml-3 text-gray-700 font-medium">{location}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-red-600">No location assigned to your user profile. Please contact an administrator.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-lg shadow-md">
                                    <h3 className="text-xl font-semibold mb-4 border-b pb-2">Step 2: Add Items to Order</h3>
                                    
                                    <details className="p-4 border rounded-md mb-4 bg-gray-50 group" open>
                                        <summary className="font-semibold text-gray-800 list-none cursor-pointer flex justify-between items-center">
                                            <span>Add from Product List</span>
                                            <ChevronDownIcon className="h-5 w-5 text-gray-500 transform transition-transform duration-200 group-open:rotate-180" />
                                        </summary>
                                        <div className="mt-4 pt-4 border-t">
                                            <div className="grid grid-cols-1 gap-6">
                                                <div className="space-y-3">
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <SearchIcon className="h-5 w-5 text-gray-400" />
                                                        </div>
                                                        <input
                                                            type="search"
                                                            placeholder="Search products..."
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
                                                        />
                                                    </div>
                                                    <div className="max-h-[30rem] overflow-y-auto border rounded-md bg-white p-2 space-y-2">
                                                        {Object.keys(groupedProducts).length > 0 ? Object.entries(groupedProducts).map(([category, subCategories]) => (
                                                            <details key={category} open={expandedCategories.has(category)} onToggle={(e) => handleToggleCategory(category, (e.target as HTMLDetailsElement).open)} className="bg-white shadow-sm rounded-lg overflow-hidden group">
                                                                <summary className="px-4 py-3 text-lg font-semibold text-gray-800 cursor-pointer list-none flex justify-between items-center bg-gray-100 hover:bg-gray-200/70 transition-colors">
                                                                    <span>{category}</span>
                                                                    <ChevronDownIcon className="h-6 w-6 text-gray-500 transform transition-transform duration-200 group-open:rotate-180" />
                                                                </summary>
                                                                <div className="p-2 space-y-1 bg-gray-50/50">
                                                                    {Object.entries(subCategories).map(([subCategory, productsInSubCategory]) => (
                                                                        <details key={`${category}-${subCategory}`} open={expandedSubCategories.has(`${category}|${subCategory}`)} onToggle={(e) => handleToggleSubCategory(category, subCategory, (e.target as HTMLDetailsElement).open)} className="group/sub">
                                                                            <summary className="px-2 py-2 text-md font-medium text-gray-700 cursor-pointer list-none flex justify-between items-center hover:bg-gray-200/50 rounded-md transition-colors">
                                                                                <span>{subCategory}</span>
                                                                                <ChevronDownIcon className="h-5 w-5 text-gray-500 transform transition-transform duration-200 group-open/sub:rotate-180" />
                                                                            </summary>
                                                                            <div className="pl-4 pt-1 space-y-1">
                                                                                {productsInSubCategory.map(product => (
                                                                                    <button
                                                                                        key={product.name}
                                                                                        onClick={() => handleSelectProductForOrder(product)}
                                                                                        className={'w-full text-left p-2 rounded-md transition-colors text-sm text-gray-600 hover:bg-indigo-100 hover:text-indigo-800'}
                                                                                    >
                                                                                        {product.name}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </details>
                                                                    ))}
                                                                </div>
                                                            </details>
                                                        )) : <p className="text-center text-gray-500 p-4">No products found.</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </details>
                                   
                                    <details className="p-4 border rounded-md bg-gray-50 group">
                                        <summary className="font-semibold text-gray-800 list-none cursor-pointer flex justify-between items-center">
                                            <span>Add Custom Item (e.g., Supplies)</span>
                                            <ChevronDownIcon className="h-5 w-5 text-gray-500 transform transition-transform duration-200 group-open:rotate-180" />
                                        </summary>
                                        <div className="mt-4 pt-4 border-t space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                                <div className="md:col-span-2">
                                                    <label className="text-sm font-medium text-gray-700">Item Name</label>
                                                    <input type="text" value={customItemName} onChange={e => setCustomItemName(e.target.value)} placeholder="e.g., Cleaning Spray" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2.5 py-1.5 text-xs font-semibold text-indigo-800 bg-indigo-100 rounded-full">QTY</span>
                                                        <AccessibleNumberInput
                                                            ariaLabel="Custom Item Quantity"
                                                            value={customItemQuantity}
                                                            onChange={setCustomItemQuantity}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            {!showCustomItemNotes ? (
                                                <button onClick={() => setShowCustomItemNotes(true)} className="text-sm text-indigo-600 hover:underline">Add Note</button>
                                            ) : (
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Notes</label>
                                                    <textarea value={customItemNotes} onChange={e => setCustomItemNotes(e.target.value)} placeholder="Optional notes for this item..." className="mt-1 block w-full p-2 border border-gray-300 rounded-md" rows={2}></textarea>
                                                </div>
                                            )}
                                            <button onClick={handleAddCustomItem} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 self-start flex items-center"><PlusIcon className="h-5 w-5 mr-2" /> Add Custom Item</button>
                                        </div>
                                    </details>
                                </div>
                            </div>

                            <div className="lg:col-span-1">
                                <div className="bg-white p-6 rounded-lg shadow-md lg:sticky top-24">
                                    <h3 className="text-xl font-semibold mb-4 border-b pb-2">Step 3: Review & Submit</h3>
                                    {orderItems.length === 0 ? (
                                        <p className="text-gray-500 text-center py-8">Your order is empty.</p>
                                    ) : (
                                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                            
                                            {(Object.entries(groupedOrderItems) as [string, OrderItem[]][]).map(([name, items]) => (
                                                <div key={name} className="border-b pb-3 last:border-b-0">
                                                    <h4 className="font-semibold text-gray-800">{name}</h4>
                                                    <ul className="pl-2 mt-1 space-y-2">
                                                        {items.map(item => (
                                                            <li key={item.id} className="flex justify-between items-start text-sm">
                                                                <div>
                                                                    <p className="text-gray-600">
                                                                        {item.color && <>Color: <span className="font-medium text-gray-800">{item.color}</span>, </>}
                                                                        Qty: <span className="font-medium text-gray-800">{item.quantity}</span>
                                                                    </p>
                                                                    {item.notes && <p className="text-xs text-gray-500 mt-1 italic">Notes: "{item.notes}"</p>}
                                                                </div>
                                                                <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0 p-1 rounded-full hover:bg-red-100 transition-colors">
                                                                    <TrashIcon className="h-4 w-4" />
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="mt-6 border-t pt-4">
                                    
                                    {submissionStatus.type === 'error' && submissionStatus.message && (
                                        <p className="text-sm font-medium mb-4 text-red-600">
                                            {submissionStatus.message}
                                        </p>
                                    )}
                                        <button
                                            onClick={handleSubmitOrder}
                                            disabled={isSubmitting || orderItems.length === 0 || selectedLocations.length === 0}
                                            className="w-full bg-indigo-600 text-white py-3 rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors font-semibold hidden lg:block"
                                        >
                                            {isSubmitting ? 'Submitting...' : 'Submit Order'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        )
                    )}
                    {activeTab === 'myOrders' && (
                        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                            <h3 className="text-xl font-semibold mb-4 border-b pb-2">My Orders (Last 7 Days)</h3>
                            {userOrders.length > 0 ? (
                                <div className="space-y-4">
                                    {Object.keys(groupedUserOrders).sort().map(location => (
                                        <details key={location} open className="bg-gray-50 rounded-lg border border-gray-200">
                                            <summary className="p-4 font-semibold text-lg text-gray-800 cursor-pointer list-none flex items-center gap-3 hover:bg-gray-100 transition-colors">
                                                <LocationTag location={location} />
                                                <span className="text-gray-600 text-base">({Object.values(groupedUserOrders[location]).flat().length} items)</span>
                                            </summary>
                                            <div className="pt-0 p-2 sm:p-4 space-y-4">
                                                {Object.keys(groupedUserOrders[location]).sort().reverse().map(date => {
                                                    const ordersForDay = groupedUserOrders[location][date];
                                                    const formattedDate = new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
                                                        weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC'
                                                    });
                                                    
                                                    return (
                                                    <div key={date} className="pl-2 sm:pl-4 border-l-2 border-indigo-200">
                                                        <h4 className="font-semibold text-gray-700 text-md mb-3 -ml-2 sm:-ml-4 pl-3 bg-gray-200/50 py-1 rounded-r-md">{formattedDate}</h4>
                                                        <div className="space-y-3">
                                                            {ordersForDay.map(order => {
                                                                const isLocked = (order.status || '').trim() !== 'Pending';
                                                                const disabledButtonClasses = "text-gray-300 cursor-not-allowed";
                                                                const enabledButtonClasses = "text-indigo-600 hover:text-indigo-900";
                                                                const enabledDeleteClasses = "text-red-600 hover:text-red-900";

                                                                return (
                                                                    <div key={order.orderID} className="bg-white border rounded-lg p-3 shadow-sm">
                                                                        <div className="flex justify-between items-start gap-2">
                                                                            <div>
                                                                                <h5 className="font-bold text-indigo-700">{order.item}</h5>
                                                                                <p className="text-sm text-gray-700 mt-1">
                                                                                    {order.colors && <>{order.colors} - </>}
                                                                                    <span className="font-semibold">{order.quantity} units</span>
                                                                                </p>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <SmallStatusBadge status={order.status} />
                                                                                <div className="flex items-center">
                                                                                    <Tooltip text={isLocked ? "Order processed by logistics. Cannot edit." : "Edit Order"}>
                                                                                        <button onClick={() => openEditModal(order)} disabled={isLocked} className={`p-1 rounded-md ${isLocked ? disabledButtonClasses : enabledButtonClasses}`}>
                                                                                            <PencilIcon className="h-5 w-5" />
                                                                                        </button>
                                                                                    </Tooltip>
                                                                                    <Tooltip text={isLocked ? "Order processed by logistics. Cannot delete." : "Delete Order"}>
                                                                                         <button onClick={() => openDeleteModal(order)} disabled={isLocked} className={`p-1 rounded-md ${isLocked ? disabledButtonClasses : enabledDeleteClasses}`}>
                                                                                            <TrashIcon className="h-5 w-5" />
                                                                                        </button>
                                                                                    </Tooltip>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        {order.notes && (
                                                                            <p className="text-xs text-gray-600 italic mt-2 pt-2 border-t">
                                                                                &quot;{order.notes}&quot;
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )})}
                                            </div>
                                        </details>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-500">
                                    You have not created any orders in the last 7 days.
                                </div>
                            )}
                        </div>
                    )}
                     {activeTab === 'shipments' && (
                        <Shipping currentUser={user} allLocations={allLocations} />
                    )}
                </div>
            </div>
            </main>
             {activeTab === 'createOrder' && submissionStatus.type !== 'success' && orderItems.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg p-4 border-t shadow-top z-20 lg:hidden">
                    <div className="flex justify-between items-center">
                        <p className="font-semibold text-gray-800">{orderItems.length} item(s) in order</p>
                        <button
                            onClick={handleSubmitOrder}
                            disabled={isSubmitting || selectedLocations.length === 0}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 font-semibold"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Order'}
                        </button>
                    </div>
                </div>
            )}
             {selectedAppSheetProduct && (
                <Modal
                    isOpen={!!selectedAppSheetProduct}
                    onClose={() => setSelectedAppSheetProduct(null)}
                    title={`Add to Order: ${selectedAppSheetProduct.name}`}
                    size="2xl"
                >
                    <div className="space-y-4">
                        {selectedAppSheetProduct.colors.length > 1 ? (
                            <>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">1. Select a Color</label>
                                    <div className="flex flex-wrap gap-2 mt-1 p-2 border rounded-md max-h-48 overflow-y-auto bg-gray-50">
                                        {selectedAppSheetProduct.colors.map(color => (
                                            <button key={color} onClick={() => handleSetActiveColor(color)}
                                                className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${activeColor === color ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'} ${stagedItemsForProduct.some(item => item.color === color) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                disabled={stagedItemsForProduct.some(item => item.color === color)}>
                                                {color}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {activeColor && (
                                    <div className="p-3 bg-indigo-50 rounded-md">
                                        <p className="text-sm font-medium text-gray-700 mb-2">2. Set Quantity for <span className="font-bold">{activeColor}</span></p>
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2.5 py-1.5 text-xs font-semibold text-indigo-800 bg-indigo-100 rounded-full">QTY</span>
                                                <AccessibleNumberInput
                                                    ariaLabel={`Quantity for ${activeColor}`}
                                                    value={activeColorQuantity}
                                                    onChange={setActiveColorQuantity}
                                                />
                                            </div>
                                            <button onClick={handleStageItem} className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-sm flex items-center justify-center grow sm:grow-0">
                                                <PlusIcon className="h-4 w-4 mr-1" /> Add
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                {stagedItemsForProduct.length > 0 && (
                                    <div className="space-y-2 border-t pt-3">
                                        <h6 className="text-sm font-semibold text-gray-600">Items to Add:</h6>
                                        <ul className="divide-y max-h-32 overflow-y-auto pr-2">
                                            {stagedItemsForProduct.map(item => (
                                                <li key={item.id} className="py-2 flex justify-between items-center">
                                                    <p><span className="font-medium">{item.color}</span> - Qty: {item.quantity}</p>
                                                    <button onClick={() => handleRemoveStagedItem(item.id)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-4 w-4" /></button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div>
                                    {showProductNotes ? (
                                        <>
                                            <label className="text-sm font-medium text-gray-700">Notes (optional, for all items)</label>
                                            <textarea value={orderProductNotes} onChange={e => setOrderProductNotes(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" rows={2}></textarea>
                                        </>
                                    ) : (
                                        <button type="button" onClick={() => setShowProductNotes(true)} className="text-sm text-indigo-600 hover:underline mt-2">Add Note</button>
                                    )}
                                </div>
                                
                                <button onClick={handleAddStagedItemsToOrder} disabled={stagedItemsForProduct.length === 0}
                                    className="mt-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center w-full justify-center disabled:bg-indigo-400">
                                    <PlusIcon className="h-5 w-5 mr-2" /> Add {stagedItemsForProduct.length} Item(s) to Order
                                </button>
                            </>
                        ) : (
                            <>
                                {selectedAppSheetProduct.colors.length === 1 && (
                                    <div className="mb-4">
                                        <label className="text-sm font-medium text-gray-700">Color</label>
                                        <p className="font-semibold text-gray-800 p-2 bg-gray-100 rounded-md mt-1">{orderProductColor}</p>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1.5 text-xs font-semibold text-indigo-800 bg-indigo-100 rounded-full">QTY</span>
                                    <AccessibleNumberInput
                                        ariaLabel="Product Quantity"
                                        value={orderProductQuantity}
                                        onChange={setOrderProductQuantity}
                                    />
                                </div>
                                <div>
                                    {showProductNotes ? (
                                        <>
                                            <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
                                            <textarea value={orderProductNotes} onChange={e => setOrderProductNotes(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" rows={2}></textarea>
                                        </>
                                    ) : (
                                        <button type="button" onClick={() => setShowProductNotes(true)} className="text-sm text-indigo-600 hover:underline mt-2">Add Note</button>
                                    )}
                                </div>
                                <button onClick={handleAddSingleItemToOrder} className="mt-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center w-full justify-center">
                                    <PlusIcon className="h-5 w-5 mr-2" /> Add to Order
                                </button>
                            </>
                        )}
                    </div>
                </Modal>
            )}

            {/* Edit Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Order">
                {editFormState && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Item Name</label>
                            <input type="text" value={editFormState.item} onChange={e => setEditFormState(p => p ? {...p, item: e.target.value} : null)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Colors</label>
                            <input type="text" value={editFormState.colors} onChange={e => setEditFormState(p => p ? {...p, colors: e.target.value} : null)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Quantity</label>
                            <input type="number" value={editFormState.quantity} onChange={e => setEditFormState(p => p ? {...p, quantity: parseInt(e.target.value) || 0} : null)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Notes</label>
                            <textarea value={editFormState.notes} onChange={e => setEditFormState(p => p ? {...p, notes: e.target.value} : null)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" rows={3}/>
                        </div>
                        {editModalError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{editModalError}</p>}
                        <div className="flex justify-end gap-2 pt-4">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
                            <button onClick={handleUpdateOrder} disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-md disabled:bg-indigo-300">
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
            
            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteOrder}
                title="Delete Order"
                message={`Are you sure you want to delete the order for "${editingOrder?.item}"? This action cannot be undone.`}
                isConfirming={isSubmitting}
                confirmText="Delete"
            />
        </div>
    );
};

export default ManagerPortal;
