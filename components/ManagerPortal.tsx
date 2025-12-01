
import React, { useState, useEffect, useMemo } from 'react';
import { User, AppSheetProduct, OrderItem, Location } from '../types';
import { getAppSheetProducts, getLocations } from '../services/dataService';
import { submitOrder } from '../services/writeService';
import { PlusIcon, TrashIcon, LoginIcon, SearchIcon, CheckCircleIcon } from './icons';
import AccessibleNumberInput from './AccessibleNumberInput';
import ConfirmationModal from './customer_service_hub/components/ConfirmationModal';

interface ManagerPortalProps {
  user: User;
  onLogout: () => void;
}

const CUSTOM_HISTORY_KEY = 'custom_item_history';

const ManagerPortal: React.FC<ManagerPortalProps> = ({ user, onLogout }) => {
  const [products, setProducts] = useState<AppSheetProduct[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // Cart State
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  
  // Custom Item State
  const [customItemName, setCustomItemName] = useState('');
  const [customItemQuantity, setCustomItemQuantity] = useState(1);
  const [customItemNotes, setCustomItemNotes] = useState('');
  const [showCustomItemNotes, setShowCustomItemNotes] = useState(false);
  const [customItemHistory, setCustomItemHistory] = useState<string[]>([]);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [productsData, locationsData] = await Promise.all([
          getAppSheetProducts(),
          getLocations()
        ]);
        setProducts(productsData);
        setLocations(locationsData);
        
        // Filter locations for this user if applicable
        const userLocs = user.location ? user.location.split(',').map(l => l.trim()) : [];
        const availableLocations = locationsData.filter(l => userLocs.includes(l.name));
        
        if (availableLocations.length > 0) {
            setSelectedLocation(availableLocations[0].name);
        } else if (locationsData.length > 0) {
             // Fallback if no specific assignment match
             setSelectedLocation(locationsData[0].name);
        }

        const history = localStorage.getItem(CUSTOM_HISTORY_KEY);
        if (history) {
            setCustomItemHistory(JSON.parse(history));
        }

      } catch (error) {
        console.error("Failed to load manager portal data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.location]);

  const handleAddProduct = (product: AppSheetProduct, color: string) => {
    const existingIndex = orderItems.findIndex(item => item.id === product.name && item.color === color);
    if (existingIndex > -1) {
        // Increment quantity if already in cart
        const newItems = [...orderItems];
        newItems[existingIndex].quantity += 1;
        setOrderItems(newItems);
    } else {
        // Add new item
        setOrderItems(prev => [...prev, {
            type: 'product',
            id: product.name,
            name: product.name,
            quantity: 1,
            color: color,
            notes: ''
        }]);
    }
  };

  const handleAddCustomItem = () => {
    if (!customItemName.trim() || customItemQuantity < 1) return;
    const newItem: OrderItem = {
        type: 'custom',
        id: `custom-${new Date().getTime()}`,
        name: customItemName.trim(),
        quantity: customItemQuantity,
        color: 'Custom',
        notes: customItemNotes.trim(),
    };
    setOrderItems(prev => [...prev, newItem]);
    
    // Save to custom item history
    const trimmedName = customItemName.trim();
    
    // Check for existing item (case-insensitive)
    const existingIndex = customItemHistory.findIndex(
        item => item.toLowerCase() === trimmedName.toLowerCase()
    );

    let newHistory = [...customItemHistory];

    // If it exists, remove it so we can add it to the top (MRU - Most Recently Used)
    if (existingIndex !== -1) {
        newHistory.splice(existingIndex, 1);
    }

    // Add to the top of the list
    newHistory.unshift(trimmedName);
    
    // Limit to 50 items
    if (newHistory.length > 50) {
        newHistory = newHistory.slice(0, 50);
    }

    setCustomItemHistory(newHistory);
    localStorage.setItem(CUSTOM_HISTORY_KEY, JSON.stringify(newHistory));

    setCustomItemName('');
    setCustomItemQuantity(1);
    setCustomItemNotes('');
    setShowCustomItemNotes(false);
  };

  const updateItemQuantity = (index: number, newQty: number) => {
      if (newQty <= 0) {
          handleRemoveItem(index);
          return;
      }
      setOrderItems(prev => {
          const newItems = [...prev];
          newItems[index].quantity = newQty;
          return newItems;
      });
  };

  const updateItemNotes = (index: number, notes: string) => {
      setOrderItems(prev => {
          const newItems = [...prev];
          newItems[index].notes = notes;
          return newItems;
      });
  };

  const handleRemoveItem = (index: number) => {
      setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitOrder = async () => {
      if (orderItems.length === 0 || !selectedLocation) return;
      setIsSubmitting(true);
      setSubmissionStatus({ type: null, message: '' });

      const payload = {
          userId: user.userID,
          userName: user.name,
          locations: [selectedLocation],
          items: orderItems
      };

      try {
          const result = await submitOrder(payload);
          if (result.success) {
              setSubmissionStatus({ type: 'success', message: 'Order submitted successfully!' });
              setOrderItems([]);
              setIsConfirmOpen(false);
          } else {
              setSubmissionStatus({ type: 'error', message: result.message });
          }
      } catch (error) {
          setSubmissionStatus({ type: 'error', message: 'Failed to submit order.' });
      } finally {
          setIsSubmitting(false);
      }
  };

  const filteredProducts = useMemo(() => {
      let filtered = products;
      if (activeCategory !== 'All') {
          filtered = filtered.filter(p => p.category === activeCategory);
      }
      if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(p => p.name.toLowerCase().includes(query));
      }
      return filtered;
  }, [products, activeCategory, searchQuery]);

  const categories = useMemo(() => {
      const cats = new Set(products.map(p => p.category).filter(Boolean));
      return ['All', ...Array.from(cats).sort()];
  }, [products]);

  if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center">
                <span className="text-2xl font-bold text-indigo-600 mr-2">Inv<span className="text-gray-700">Sys</span></span>
                <span className="hidden sm:inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">Manager Portal</span>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{selectedLocation}</p>
                </div>
                <button onClick={onLogout} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full" title="Logout">
                    <LoginIcon className="h-6 w-6 transform -scale-x-100" />
                </button>
            </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Left Column: Product Selection */}
        <div className="flex-grow lg:w-2/3 space-y-6">
            {/* Custom Item Input */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-3">Add Custom Item</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-grow relative">
                        <input 
                            type="text" 
                            placeholder="Item Name" 
                            value={customItemName}
                            onChange={(e) => setCustomItemName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            list="custom-history"
                        />
                        <datalist id="custom-history">
                            {customItemHistory.map((item, idx) => <option key={idx} value={item} />)}
                        </datalist>
                    </div>
                    <div className="w-24">
                        <input 
                            type="number" 
                            min="1" 
                            value={customItemQuantity}
                            onChange={(e) => setCustomItemQuantity(parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <button 
                        onClick={handleAddCustomItem}
                        disabled={!customItemName.trim()}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        Add Item
                    </button>
                </div>
                {showCustomItemNotes ? (
                    <textarea 
                        className="mt-3 w-full p-2 border border-gray-300 rounded-md text-sm" 
                        placeholder="Notes for this item..."
                        rows={2}
                        value={customItemNotes}
                        onChange={e => setCustomItemNotes(e.target.value)}
                    />
                ) : (
                    <button onClick={() => setShowCustomItemNotes(true)} className="text-xs text-indigo-600 mt-2 hover:underline">
                        + Add Note
                    </button>
                )}
            </div>

            {/* Product List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 className="font-semibold text-gray-800">Product Catalog</h3>
                    <div className="flex w-full sm:w-auto gap-2">
                        <select 
                            value={activeCategory} 
                            onChange={(e) => setActiveCategory(e.target.value)}
                            className="border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <div className="relative flex-grow">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-4 w-4 text-gray-400"/></div>
                            <input 
                                type="search" 
                                placeholder="Search..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 w-full border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                    {filteredProducts.map(product => (
                        <div key={product.name} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-medium text-gray-900">{product.name}</h4>
                                    <p className="text-xs text-gray-500">{product.category} &rsaquo; {product.subCategory}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {product.colors.map(color => (
                                    <button 
                                        key={color}
                                        onClick={() => handleAddProduct(product, color)}
                                        className="px-3 py-1 text-xs rounded-full bg-white border border-gray-300 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
                                    >
                                        + {color}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                    {filteredProducts.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            No products found matching your criteria.
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Right Column: Order Summary (Cart) */}
        <div className="lg:w-1/3 flex flex-col gap-6">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col h-full sticky top-24 max-h-[calc(100vh-8rem)]">
                <div className="p-4 border-b border-gray-200 bg-indigo-50">
                    <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                        <span>Current Order</span>
                        <span className="bg-indigo-200 text-indigo-800 text-xs px-2 py-0.5 rounded-full">{orderItems.length} items</span>
                    </h3>
                    <div className="mt-2 text-sm text-gray-600">
                        Location: <span className="font-medium">{selectedLocation}</span>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                    {orderItems.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            Your cart is empty. Add items from the catalog or create a custom item.
                        </div>
                    ) : (
                        orderItems.map((item, index) => (
                            <div key={`${item.id}-${item.color}-${index}`} className="flex flex-col bg-gray-50 p-3 rounded-md border border-gray-100">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                                        <p className="text-xs text-gray-500">{item.color}</p>
                                    </div>
                                    <button onClick={() => handleRemoveItem(index)} className="text-gray-400 hover:text-red-500 p-1">
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <AccessibleNumberInput 
                                        value={item.quantity} 
                                        onChange={(val) => updateItemQuantity(index, val)} 
                                        min={0}
                                        className="scale-90 origin-left"
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Notes..." 
                                        value={item.notes}
                                        onChange={(e) => updateItemNotes(index, e.target.value)}
                                        className="flex-grow text-xs border-gray-300 rounded p-1.5 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    {submissionStatus.message && (
                        <div className={`mb-3 p-2 text-sm rounded ${submissionStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {submissionStatus.message}
                        </div>
                    )}
                    <button 
                        onClick={() => setIsConfirmOpen(true)}
                        disabled={orderItems.length === 0 || isSubmitting}
                        className="w-full bg-indigo-600 text-white py-3 rounded-md font-bold shadow hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Order'}
                    </button>
                </div>
            </div>
        </div>
      </main>

      <ConfirmationModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleSubmitOrder}
        title="Confirm Order"
        message={`Are you sure you want to submit this order with ${orderItems.length} items for ${selectedLocation}?`}
        confirmText="Submit Order"
        isConfirming={isSubmitting}
      />
    </div>
  );
};

export default ManagerPortal;
