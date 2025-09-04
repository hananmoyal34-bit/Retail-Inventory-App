import React, { useState, useEffect, useMemo } from 'react';
import { getProducts, getLocations, getInventoryLogs, getCurrentDateInTimezone, formatDateToYMD, getAppSheetProducts, formatToLocaleString } from '../services/dataService';
import { submitInventoryCount, submitWarehouseCount } from '../services/writeService';
// FIX: Import User type to handle user information for warehouse count submission.
import { CountEntry, Product, Location, InventoryLog, WarehouseCountEntry, AppSheetProduct, User } from '../types';
import AccessibleNumberInput from './AccessibleNumberInput';
import DatePicker from './DatePicker';
import Modal from './Modal';
import { PencilIcon, CheckIcon, XIcon, SearchIcon, ChevronRightIcon, CheckCircleIcon, ChevronDownIcon } from './icons';

const InventoryCount: React.FC = () => {
  const [date, setDate] = useState(getCurrentDateInTimezone());
  const [selectedLocation, setSelectedLocation] = useState('');
  const [countEntries, setCountEntries] = useState<CountEntry[]>([]);
  const [activeTab, setActiveTab] = useState('count');
  
  const [editingOpeningStock, setEditingOpeningStock] = useState<string | null>(null);
  const [tempOpeningStock, setTempOpeningStock] = useState<number>(0);

  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [touchedRows, setTouchedRows] = useState<Set<string>>(new Set());
  
  // New state for Warehouse Count
  const [appSheetProducts, setAppSheetProducts] = useState<AppSheetProduct[]>([]);
  const [warehouseSelections, setWarehouseSelections] = useState<{ [productName: string]: { quantities: { [color: string]: number }, notes: string } }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubCategories, setExpandedSubCategories] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());

  // New UI State
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [visibleNotes, setVisibleNotes] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    setSubmissionStatus({ type: null, message: '' });
    setTouchedRows(new Set());
    setWarehouseSelections({});
    try {
      const [productsData, locationsData, logsData, appSheetProductsData] = await Promise.all([
        getProducts(),
        getLocations(),
        getInventoryLogs(),
        getAppSheetProducts(),
      ]);
      setProducts(productsData);
      setLocations(locationsData);
      setAppSheetProducts(appSheetProductsData);
      
      if (locationsData.length > 0 && !selectedLocation) {
        setSelectedLocation(locationsData[0].name);
      }
      setInventoryLogs(logsData);
    } catch (error) {
      console.error("Failed to fetch data for inventory count", error);
      setSubmissionStatus({ type: 'error', message: 'Failed to load data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const openingStock = useMemo(() => {
    const stockMap = new Map<string, number>();
    inventoryLogs.filter(log => {
        if (log.location !== selectedLocation) return false;
        const logDate = formatDateToYMD(log.date);
        return logDate && logDate < date;
      })
      .forEach(log => {
        stockMap.set(log.productName, (stockMap.get(log.productName) || 0) + log.quantity);
      });
    return stockMap;
  }, [date, selectedLocation, inventoryLogs]);
  
  useEffect(() => {
    if (loading || products.length === 0) return;
    
    if(activeTab === 'count') {
        const initialEntries = products.map(product => {
          const calculatedValue = openingStock.get(product.productName) || 0;
          return {
              productID: product.productID,
              productName: product.productName,
              openingStock: calculatedValue,
              calculatedOpeningStock: calculatedValue,
              isOpeningStockManual: false,
              stockIn: 0,
              inStoreSales: 0,
              warehouseShipping: 0,
              physicalEndCount: 0,
          };
        });
        setCountEntries(initialEntries);
        setEditingOpeningStock(null);
        setTouchedRows(new Set());
        setExpandedProducts(new Set()); // Collapse all by default
    }
  }, [selectedLocation, date, openingStock, products, loading, activeTab]);

  const handleEntryChange = (productID: string, field: keyof CountEntry, value: number) => {
    setTouchedRows(prev => new Set(prev).add(productID));
    setCountEntries(prevEntries =>
      prevEntries.map(entry =>
        entry.productID === productID ? { ...entry, [field]: value } : entry
      )
    );
  };
  
  const handleEditOpeningStock = (entry: CountEntry) => {
    setEditingOpeningStock(entry.productID);
    setTempOpeningStock(entry.openingStock);
  };

  const handleSaveOpeningStock = (productID: string) => {
    setTouchedRows(prev => new Set(prev).add(productID));
    setCountEntries(prevEntries =>
      prevEntries.map(entry => {
        if (entry.productID === productID) {
          return { 
            ...entry, 
            openingStock: tempOpeningStock, 
            isOpeningStockManual: tempOpeningStock !== entry.calculatedOpeningStock
          };
        }
        return entry;
      })
    );
    setEditingOpeningStock(null);
  };

  const handleCancelEditOpeningStock = () => {
    setEditingOpeningStock(null);
  };

  const handleOpenConfirmModal = () => {
    setSubmissionStatus({ type: null, message: '' });
    const entriesToSubmit = countEntries.filter(e => touchedRows.has(e.productID));
    if (entriesToSubmit.length === 0) {
      setSubmissionStatus({ type: 'error', message: 'No changes to submit. Please enter count data.' });
      return;
    }
    setIsConfirmModalOpen(true);
  };
  
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    const entriesToSubmit = countEntries.filter(e => touchedRows.has(e.productID));

    const submissionTimestamp = new Date();
    const [year, month, day] = date.split('-').map(Number);
    submissionTimestamp.setFullYear(year, month - 1, day);

    const payload = {
        date: submissionTimestamp.toISOString(),
        location: selectedLocation,
        entries: entriesToSubmit,
    };

    const result = await submitInventoryCount(payload);
    
    setIsConfirmModalOpen(false);

    if (result.success) {
        setSubmissionStatus({ type: 'success', message: result.message });
        // Don't call fetchData here; let the success screen's button do it.
    } else {
        setSubmissionStatus({ type: 'error', message: result.message });
    }
    setIsSubmitting(false);
  };
  
  // --- Warehouse Count Logic ---
  
  const handleWarehouseQuantityChange = (productName: string, color: string, newQuantity: number) => {
      setWarehouseSelections(prev => {
        const currentProduct = prev[productName] || { quantities: {}, notes: '' };
        const newQuantities = { ...currentProduct.quantities, [color]: newQuantity };
        
        if (newQuantity <= 0) {
            delete newQuantities[color];
        }
        
        const updatedProduct = { ...currentProduct, quantities: newQuantities };

        if (Object.keys(updatedProduct.quantities).length === 0 && !updatedProduct.notes) {
            const { [productName]: _, ...rest } = prev;
            return rest;
        }

        return { ...prev, [productName]: updatedProduct };
      });
  };

  const handleWarehouseNotesChange = (productName: string, newNotes: string) => {
      setWarehouseSelections(prev => {
          const currentProduct = prev[productName] || { quantities: {}, notes: '' };
          const updatedProduct = { ...currentProduct, notes: newNotes };
          
          if (Object.keys(updatedProduct.quantities).length === 0 && !updatedProduct.notes) {
              const { [productName]: _, ...rest } = prev;
              return rest;
          }

          return { ...prev, [productName]: updatedProduct };
      });
  };

  const handleNotesBlur = (productName: string) => {
    const note = warehouseSelections[productName]?.notes || '';
    if (!note) {
        setVisibleNotes(prev => {
            const newSet = new Set(prev);
            newSet.delete(productName);
            return newSet;
        });
    }
  };

  const groupedWarehouseProducts = useMemo(() => {
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
  
  useEffect(() => {
    if (searchQuery) {
        const newExpandedCategories = new Set<string>();
        const newExpandedSubCategories = new Set<string>();
        Object.entries(groupedWarehouseProducts).forEach(([category, subCategories]) => {
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
  }, [searchQuery, groupedWarehouseProducts]);

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

  const handleSubmitWarehouseCount = async () => {
    setIsSubmitting(true);
    setSubmissionStatus({ type: null, message: '' });

    const entriesToSubmit: WarehouseCountEntry[] = Object.entries(warehouseSelections).flatMap(([productName, selection]) => {
        const productNotes = selection.notes;
        return Object.entries(selection.quantities)
            .filter(([, quantity]) => quantity > 0)
            .map(([color, quantity]) => ({
                productID: productName,
                productName: productName,
                quantity: quantity,
                color: color,
                notes: productNotes,
            }));
    });
    
    if (entriesToSubmit.length === 0) {
        setSubmissionStatus({ type: 'error', message: 'No items with a quantity greater than 0 were entered.' });
        setIsSubmitting(false);
        return;
    }

    const submissionTimestamp = new Date();
    const [year, month, day] = date.split('-').map(Number);
    submissionTimestamp.setFullYear(year, month - 1, day);

    // FIX: Get user from session storage to include in the payload.
    const savedUserJson = sessionStorage.getItem('inventory_portal_user');
    const user: User | null = savedUserJson ? JSON.parse(savedUserJson) : null;

    const payload = {
        date: submissionTimestamp.toISOString(),
        // FIX: Added missing 'userName' property.
        userName: user?.name || 'System',
        entries: entriesToSubmit,
    };
    
    const result = await submitWarehouseCount(payload);

    if (result.success) {
        setSubmissionStatus({ type: 'success', message: result.message });
        setWarehouseSelections({});
        setSearchQuery('');
    } else {
        setSubmissionStatus({ type: 'error', message: result.message });
    }

    setIsSubmitting(false);
  };
  
  const warehouseSummaryItems = useMemo(() => {
      const items = [];
      let totalQty = 0;
      for (const [productName, selection] of Object.entries(warehouseSelections)) {
          const colorEntries = Object.entries(selection.quantities).filter(([, qty]) => qty > 0);
          if (colorEntries.length > 0 || selection.notes) {
              const productQty = colorEntries.reduce((sum, [, qty]) => sum + qty, 0);
              totalQty += productQty;
              items.push({
                  productName,
                  totalQuantity: productQty,
                  colors: colorEntries.map(([color, quantity]) => ({ color, quantity })),
                  notes: selection.notes
              });
          }
      }
      return {
          items: items.sort((a,b) => a.productName.localeCompare(b.productName)),
          totalUniqueItems: items.length,
          totalQuantity: totalQty,
      };
  }, [warehouseSelections]);

  // -----------------------------

  const renderVariance = (entry: CountEntry) => {
    const calculatedEndCount = entry.openingStock + entry.stockIn - entry.inStoreSales - entry.warehouseShipping;
    const variance = entry.physicalEndCount - calculatedEndCount;
    const color = variance === 0 ? 'text-green-600' : 'text-red-600';
    const sign = variance > 0 ? '+' : '';
    return <span className={`font-bold ${color}`}>{sign}{variance}</span>;
  };

  const renderTabButton = (tabName: string, label: string) => {
    const isActive = activeTab === tabName;
    return (
      <button
        onClick={() => { setActiveTab(tabName); setSubmissionStatus({type: null, message: ''}); }}
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
  
  // --- Mobile Card Expansion Logic ---
  const toggleProductExpansion = (productID: string) => {
    setExpandedProducts(prev => {
        const newSet = new Set(prev);
        if (newSet.has(productID)) {
            newSet.delete(productID);
        } else {
            newSet.add(productID);
        }
        return newSet;
    });
  };
  
  const expandAll = () => setExpandedProducts(new Set(countEntries.map(e => e.productID)));
  const collapseAll = () => setExpandedProducts(new Set());
  // ---------------------------------
  
  if (loading) {
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Inventory Counts</h2>
            <p>Loading inventory data...</p>
        </div>
    );
  }

  if ((activeTab === 'count' || activeTab === 'warehouse') && submissionStatus.type === 'success') {
    const startNewLabel = activeTab === 'count' ? 'Start New Count' : 'Start New Warehouse Count';
    const handleReset = activeTab === 'count' ? fetchData : () => {
        setSubmissionStatus({ type: null, message: '' });
        // Don't refetch all data, just reset the form state
        setWarehouseSelections({});
        setSearchQuery('');
    };

    return (
        <div className="text-center p-8 bg-green-50 rounded-lg border border-green-200 max-w-lg mx-auto">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />
            <h3 className="text-2xl font-bold text-green-800 mt-4">Success!</h3>
            <p className="mt-2 text-green-700">{submissionStatus.message}</p>
            <button 
                onClick={handleReset} 
                className="mt-6 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
            >
                {startNewLabel}
            </button>
        </div>
    );
}


  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-3xl font-bold text-gray-900">Inventory Counts</h2>
        <div className="text-sm text-gray-700 bg-gray-100 px-3 py-1.5 rounded-md font-medium">
            {formatToLocaleString(currentTime)}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <DatePicker label="Date" value={date} onChange={setDate} allowClear={false} />
          </div>
          <div className={activeTab === 'warehouse' ? 'invisible' : ''}>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
            <select
              id="location"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {locations.map(loc => <option key={loc.id} value={loc.name}>{loc.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {renderTabButton('count', 'Daily Count')}
              {renderTabButton('warehouse', 'Warehouse Count')}
          </nav>
      </div>
      
      {activeTab === 'count' && (
        <>
          <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirm Submission" size="2xl">
            <div className="space-y-4">
                <p>Please review the following changes before submitting. Only items you've entered data for are shown.</p>
                <div className="max-h-96 overflow-y-auto border rounded-md">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="px-3 py-2 text-left font-semibold text-gray-600">Product</th>
                                <th className="px-3 py-2 text-right font-semibold text-gray-600">Physical End</th>
                                <th className="px-3 py-2 text-right font-semibold text-gray-600">Variance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {countEntries.filter(e => touchedRows.has(e.productID)).map(entry => (
                                <tr key={entry.productID}>
                                    <td className="px-3 py-2 font-medium text-gray-800">{entry.productName}</td>
                                    <td className="px-3 py-2 text-right font-bold text-indigo-600">{entry.physicalEndCount}</td>
                                    <td className="px-3 py-2 text-right">{renderVariance(entry)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <button onClick={() => setIsConfirmModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                    <button onClick={handleConfirmSubmit} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
                        {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
                    </button>
                </div>
            </div>
          </Modal>

          {/* Desktop & Tablet View */}
          <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opening (WAS)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock In (+)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales (-)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shipping (-)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calculated End</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Physical End Count</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {countEntries.map(entry => {
                    const calculatedEndCount = entry.openingStock + entry.stockIn - entry.inStoreSales - entry.warehouseShipping;
                    return (
                      <tr key={entry.productID} className="odd:bg-white even:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800">{entry.productName}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {editingOpeningStock === entry.productID ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                value={tempOpeningStock}
                                onChange={(e) => setTempOpeningStock(parseInt(e.target.value, 10) || 0)}
                                className="w-20 p-1 border rounded"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveOpeningStock(entry.productID); if (e.key === 'Escape') handleCancelEditOpeningStock(); }}
                              />
                              <button onClick={() => handleSaveOpeningStock(entry.productID)} className="p-1 rounded-md text-green-600 hover:text-green-800"><CheckIcon /></button>
                              <button onClick={handleCancelEditOpeningStock} className="p-1 rounded-md text-red-600 hover:text-red-800"><XIcon /></button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span>{entry.openingStock}</span>
                              {entry.isOpeningStockManual && <span title={`Manually set. Calculated was ${entry.calculatedOpeningStock}.`} className="text-blue-500 font-bold cursor-help">*</span>}
                              <button onClick={() => handleEditOpeningStock(entry)} className="p-1 rounded-md text-gray-400 hover:text-indigo-600">
                                <PencilIcon className="w-5 h-5" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3"><AccessibleNumberInput value={entry.stockIn} onChange={(newValue) => handleEntryChange(entry.productID, 'stockIn', newValue)} ariaLabel={`Stock in for ${entry.productName}`} /></td>
                        <td className="px-4 py-3"><AccessibleNumberInput value={entry.inStoreSales} onChange={(newValue) => handleEntryChange(entry.productID, 'inStoreSales', newValue)} ariaLabel={`In-store sales for ${entry.productName}`} /></td>
                        <td className="px-4 py-3"><AccessibleNumberInput value={entry.warehouseShipping} onChange={(newValue) => handleEntryChange(entry.productID, 'warehouseShipping', newValue)} ariaLabel={`Warehouse shipping for ${entry.productName}`} /></td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-600">{calculatedEndCount}</td>
                        <td className="px-4 py-3"><AccessibleNumberInput value={entry.physicalEndCount} onChange={(newValue) => handleEntryChange(entry.productID, 'physicalEndCount', newValue)} inputClassName="bg-yellow-100 font-semibold" ariaLabel={`Physical end count for ${entry.productName}`} /></td>
                        <td className="px-4 py-3 text-sm">{renderVariance(entry)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
           {/* Mobile Card View */}
           <div className="md:hidden space-y-3">
              <div className="flex justify-end space-x-2 mb-2">
                <button onClick={expandAll} className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md">Expand All</button>
                <button onClick={collapseAll} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-md">Collapse All</button>
              </div>
             {countEntries.map(entry => {
                const calculatedEndCount = entry.openingStock + entry.stockIn - entry.inStoreSales - entry.warehouseShipping;
                const isExpanded = expandedProducts.has(entry.productID);
                return (
                    <div key={entry.productID} className="bg-white rounded-lg shadow-md transition-all duration-200">
                        <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => toggleProductExpansion(entry.productID)}>
                            <h3 className="font-bold text-lg text-gray-800">{entry.productName}</h3>
                            <ChevronRightIcon className={`h-5 w-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>

                        {isExpanded && (
                            <div className="p-4 border-t space-y-4">
                                <div className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                                    <div className="text-sm">
                                        <span className="font-medium text-gray-600">Opening Stock</span>
                                        {entry.isOpeningStockManual && <span title={`Manually set. Calculated was ${entry.calculatedOpeningStock}.`} className="text-blue-500 font-bold cursor-help ml-2">*</span>}
                                    </div>
                                    {editingOpeningStock === entry.productID ? (
                                        <div className="flex items-center space-x-1">
                                            <input type="number" value={tempOpeningStock} onChange={e => setTempOpeningStock(parseInt(e.target.value, 10) || 0)} className="w-20 p-1 border rounded" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleSaveOpeningStock(entry.productID); if (e.key === 'Escape') handleCancelEditOpeningStock(); }} />
                                            <button onClick={() => handleSaveOpeningStock(entry.productID)} className="p-2 text-green-600 hover:text-green-800 rounded-md"><CheckIcon /></button>
                                            <button onClick={handleCancelEditOpeningStock} className="p-2 text-red-600 hover:text-red-800 rounded-md"><XIcon /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2">
                                            <span className="font-semibold text-gray-800">{entry.openingStock}</span>
                                            <button onClick={() => handleEditOpeningStock(entry)} className="p-2 text-gray-400 hover:text-indigo-600 rounded-md"><PencilIcon className="w-6 h-6" /></button>
                                        </div>
                                    )}
                                </div>
        
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <p className="block text-sm font-medium text-gray-700 mb-1">Stock In (+)</p>
                                        <AccessibleNumberInput value={entry.stockIn} onChange={(newValue) => handleEntryChange(entry.productID, 'stockIn', newValue)} ariaLabel={`Stock in for ${entry.productName}`} />
                                    </div>
                                     <div>
                                        <p className="block text-sm font-medium text-gray-700 mb-1">Sales (-)</p>
                                        <AccessibleNumberInput value={entry.inStoreSales} onChange={(newValue) => handleEntryChange(entry.productID, 'inStoreSales', newValue)} ariaLabel={`In-store sales for ${entry.productName}`} />
                                    </div>
                                     <div>
                                        <p className="block text-sm font-medium text-gray-700 mb-1">Shipping (-)</p>
                                        <AccessibleNumberInput value={entry.warehouseShipping} onChange={(newValue) => handleEntryChange(entry.productID, 'warehouseShipping', newValue)} ariaLabel={`Warehouse shipping for ${entry.productName}`} />
                                    </div>
                                </div>
        
                                <div className="bg-indigo-50 p-3 rounded-md">
                                  <div className="flex flex-wrap justify-between items-center gap-2">
                                    <label htmlFor={`physical-count-${entry.productID}`} className="text-base font-semibold text-indigo-800">Physical End Count</label>
                                    <AccessibleNumberInput 
                                      id={`physical-count-${entry.productID}`}
                                      value={entry.physicalEndCount} 
                                      onChange={(newValue) => handleEntryChange(entry.productID, 'physicalEndCount', newValue)} 
                                      inputClassName="bg-yellow-100 font-semibold" 
                                      ariaLabel={`Physical end count for ${entry.productName}`} 
                                    />
                                  </div>
                                  <div className="mt-3 flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Calculated End: <strong className="text-gray-800">{calculatedEndCount}</strong></span>
                                    <span className="text-gray-600">Variance: <strong className="text-lg">{renderVariance(entry)}</strong></span>
                                  </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
             })}
           </div>

          {/* Sticky Footer for Mobile */}
          <div className="md:hidden sticky bottom-0 bg-white p-4 border-t border-gray-200 shadow-top z-10">
            <div className="flex justify-end items-center space-x-4">
                {submissionStatus.message && !isConfirmModalOpen && <p className={`text-sm font-medium ${submissionStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{submissionStatus.message}</p>}
                <button onClick={handleOpenConfirmModal} className="bg-indigo-600 text-white px-8 py-3 text-base font-semibold rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors" disabled={isSubmitting || loading}>
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
            </div>
          </div>
          
          {/* Footer for Desktop/Tablet */}
          <div className="hidden md:flex justify-end items-center space-x-4 mt-4">
            {submissionStatus.message && (
              <p className={`text-sm font-medium ${submissionStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {submissionStatus.message}
              </p>
            )}
            <button 
              onClick={handleOpenConfirmModal}
              className="bg-indigo-600 text-white px-8 py-3 text-base font-semibold rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
              disabled={isSubmitting || loading}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Count'}
            </button>
          </div>
        </>
      )}

      {activeTab === 'warehouse' && (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-md">
                  <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <SearchIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                          type="search"
                          placeholder="Search products..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                  </div>
              </div>

              <div className="space-y-2">
                  {Object.keys(groupedWarehouseProducts).length > 0 ? Object.entries(groupedWarehouseProducts).map(([category, subCategories]) => (
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
                                      <div className="pl-2 pt-1 space-y-2">
                                          {productsInSubCategory.map(product => {
                                            const isNotesVisible = visibleNotes.has(product.name);
                                            const currentNotes = warehouseSelections[product.name]?.notes || '';

                                            return (
                                              <div key={product.name} className="p-4 bg-white border rounded-md">
                                                  <h4 className="font-semibold text-gray-800">{product.name}</h4>
                                                  <div className="mt-3 space-y-3">
                                                      {product.colors.map(color => (
                                                        <div key={color} className="flex items-center justify-between gap-4">
                                                            <span className="font-medium text-gray-600">{color}</span>
                                                            <AccessibleNumberInput
                                                                value={warehouseSelections[product.name]?.quantities?.[color] || 0}
                                                                onChange={(newValue) => handleWarehouseQuantityChange(product.name, color, newValue)}
                                                                inputClassName="bg-yellow-100 font-semibold"
                                                                ariaLabel={`Quantity for ${product.name} ${color}`}
                                                            />
                                                        </div>
                                                      ))}
                                                  </div>
                                                  <div className="mt-4">
                                                    {isNotesVisible || currentNotes ? (
                                                        <>
                                                            <label htmlFor={`notes-${product.name}`} className="block text-sm font-medium text-gray-600">Notes</label>
                                                            <textarea
                                                                id={`notes-${product.name}`}
                                                                value={currentNotes}
                                                                onChange={(e) => handleWarehouseNotesChange(product.name, e.target.value)}
                                                                onBlur={() => handleNotesBlur(product.name)}
                                                                placeholder="Optional notes..."
                                                                className="mt-1 w-full max-w-md p-2 border border-gray-300 rounded-md text-sm"
                                                                rows={2}
                                                            />
                                                        </>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setVisibleNotes(prev => new Set(prev).add(product.name));
                                                            }}
                                                            className="text-sm text-indigo-600 hover:underline"
                                                        >
                                                            Add Note
                                                        </button>
                                                    )}
                                                  </div>
                                              </div>
                                            );
                                          })}
                                      </div>
                                  </details>
                              ))}
                          </div>
                      </details>
                  )) : (
                    <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow">
                        <p>No products found for your search.</p>
                    </div>
                  )}
              </div>
            </div>

            <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-lg shadow-md sticky top-8">
                    <h3 className="text-xl font-semibold mb-4 border-b pb-2">Count Summary</h3>
                    {warehouseSummaryItems.totalUniqueItems === 0 ? (
                        <p className="text-gray-500 text-center py-8">No items have been counted yet.</p>
                    ) : (
                       <>
                         <div className="flex justify-between items-baseline mb-4 text-gray-700">
                            <p>Unique Items: <span className="font-bold text-indigo-600">{warehouseSummaryItems.totalUniqueItems}</span></p>
                            <p>Total Units: <span className="font-bold text-indigo-600">{warehouseSummaryItems.totalQuantity}</span></p>
                         </div>
                         <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {warehouseSummaryItems.items.map(item => (
                                <div key={item.productName} className="border-b pb-3 last:border-b-0">
                                    <h4 className="font-semibold text-gray-800">{item.productName}</h4>
                                    <ul className="pl-2 mt-1 space-y-1">
                                        {item.colors.map(colorItem => (
                                            <li key={colorItem.color} className="flex justify-between items-start text-sm text-gray-600">
                                                <span>{colorItem.color}</span>
                                                <span className="font-medium text-gray-800">{colorItem.quantity}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    {item.notes && <p className="text-xs text-gray-500 mt-2 italic bg-gray-50 p-2 rounded">Notes: "{item.notes}"</p>}
                                </div>
                            ))}
                         </div>
                       </>
                    )}
                    <div className="mt-6 border-t pt-4">
                      {submissionStatus.message && (
                        <p className={`text-sm font-medium mb-4 ${submissionStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {submissionStatus.message}
                        </p>
                      )}
                      <button 
                        onClick={handleSubmitWarehouseCount}
                        className="w-full bg-indigo-600 text-white px-6 py-3 rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors font-semibold"
                        disabled={isSubmitting || loading || warehouseSummaryItems.totalUniqueItems === 0}
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Warehouse Count'}
                      </button>
                    </div>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default InventoryCount;