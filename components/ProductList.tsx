
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppSheetProduct, ProductCategory, Product } from '../types';
import { getAppSheetProducts, getProductCategories, getProducts } from '../services/dataService';
import { updateAppSheetProduct, updateDailyCountStatus, deleteAppSheetProduct, addAppSheetProduct, updateProductStatus } from '../services/writeService';
import CategoryManager from './CategoryManager';
import Modal from './Modal';
import { PencilIcon, ChevronDownIcon, ViewGridIcon, TableCellsIcon, SearchIcon, TrashIcon, LockClosedIcon, LockOpenIcon, XIcon, PlusIcon, CheckCircleIcon, XCircleIcon } from './icons';
import ConfirmationModal from './customer_service_hub/components/ConfirmationModal';

type ViewMode = 'grouped' | 'table';
type SortKey = keyof AppSheetProduct;

const ProductList: React.FC = () => {
  const [appSheetProducts, setAppSheetProducts] = useState<AppSheetProduct[]>([]);
  const [dailyCountProducts, setDailyCountProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AppSheetProduct | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    colors: [] as string[],
    category: '',
    subCategory: '',
    lowStockThreshold: 10,
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isNameColorEditable, setIsNameColorEditable] = useState(false);
  const [colorInput, setColorInput] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<AppSheetProduct | null>(null);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubCategories, setExpandedSubCategories] = useState<Set<string>>(new Set());

  const [updatingDailyCount, setUpdatingDailyCount] = useState<Set<string>>(new Set());
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [appSheetProductsData, categoriesData, dailyCountData] = await Promise.all([
        getAppSheetProducts(),
        getProductCategories(),
        getProducts(),
      ]);
      setAppSheetProducts(appSheetProductsData);
      setProductCategories(categoriesData);
      setDailyCountProducts(dailyCountData);
    } catch (error) {
      console.error("Failed to fetch product data", error);
      setError("Failed to load product data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const dailyCountProductNames = useMemo(() => new Set(dailyCountProducts.map(p => p.productName)), [dailyCountProducts]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, Set<string>>();
    productCategories
      .filter(c => c.category && c.category.toLowerCase() !== 'category' && c.category.toLowerCase() !== 'sub-category')
      .forEach(cat => {
        const subCatSet = map.get(cat.category) || new Set<string>();
        cat.subCategory.split(',').map(s => s.trim()).filter(Boolean).forEach(sub => {
            subCatSet.add(sub);
        });
        map.set(cat.category, subCatSet);
    });

    const result: Record<string, string[]> = {};
    map.forEach((subCatsSet, cat) => {
        result[cat] = Array.from(subCatsSet).sort();
    });

    return result;
  }, [productCategories]);

  const filteredProducts = useMemo(() => {
    let products = appSheetProducts;
    
    // Filter out inactive if toggle is off
    if (!showInactive) {
        products = products.filter(p => p.isActive !== false);
    } else {
        // If showing inactive, prioritize showing ONLY inactive
        products = products.filter(p => p.isActive === false);
    }

    if (!searchQuery.trim()) {
      return products;
    }
    return products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [appSheetProducts, searchQuery, showInactive]);

  const groupedProducts = useMemo(() => {
    const grouped: { [category: string]: { [subCategory: string]: AppSheetProduct[] } } = {};
    filteredProducts.forEach(p => {
        const category = p.category || 'Uncategorized';
        const subCategory = p.subCategory || 'General';
        if (!grouped[category]) grouped[category] = {};
        if (!grouped[category][subCategory]) grouped[category][subCategory] = [];
        grouped[category][subCategory].push(p);
    });
    
    const sortedGrouped: typeof grouped = {};
    Object.keys(grouped).sort().forEach(cat => {
        sortedGrouped[cat] = {};
        Object.keys(grouped[cat]).sort().forEach(subCat => {
            sortedGrouped[cat][subCat] = grouped[cat][subCat].sort((a,b) => a.name.localeCompare(b.name));
        });
    });
    return sortedGrouped;
  }, [filteredProducts]);
  
  const sortedProducts = useMemo(() => {
    let sortableItems = [...filteredProducts];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (typeof aValue === 'number' && typeof bValue === 'number') {
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        } else {
            const aStr = String(aValue).toLowerCase();
            const bStr = String(bValue).toLowerCase();
            if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredProducts, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const openModalForAdd = () => {
    setEditingProduct(null);
    setFormState({
        name: '',
        colors: [],
        category: '',
        subCategory: '',
        lowStockThreshold: 10,
        isActive: true,
    });
    setError(null);
    setIsNameColorEditable(true); // Always editable for new products
    setColorInput('');
    setIsModalOpen(true);
  };

  const openModalForEdit = (product: AppSheetProduct) => {
    setEditingProduct(product);
    setFormState({
      name: product.name,
      colors: [...product.colors],
      category: product.category,
      subCategory: product.subCategory,
      lowStockThreshold: product.lowStockThreshold,
      isActive: product.isActive !== false,
    });
    setError(null);
    setIsNameColorEditable(false);
    setColorInput('');
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormState(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormState(prev => ({ ...prev, [name]: value }));
    }
  }

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    setFormState(prev => ({
        ...prev,
        category: newCategory,
        subCategory: '',
    }));
  };

  const handleColorInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newColor = colorInput.trim();
      if (newColor && !formState.colors.map(c => c.toLowerCase()).includes(newColor.toLowerCase())) {
          setFormState(prev => ({...prev, colors: [...prev.colors, newColor]}));
      }
      setColorInput('');
    }
  };

  const removeColor = (colorToRemove: string) => {
      setFormState(prev => ({...prev, colors: prev.colors.filter(c => c !== colorToRemove)}));
  };


  const handleSave = async () => {
    if (!formState.name.trim()) {
      setError('Product name cannot be empty.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    let result;
    if (editingProduct) {
        result = await updateAppSheetProduct({
            oldName: editingProduct.name,
            name: formState.name,
            colors: formState.colors.join(', '),
            category: formState.category.trim(),
            subCategory: formState.subCategory.trim(),
            lowStockThreshold: Number(formState.lowStockThreshold) || 0,
            isActive: formState.isActive,
        });
    } else {
        result = await addAppSheetProduct({
            name: formState.name,
            colors: formState.colors, // array
            category: formState.category.trim(),
            subCategory: formState.subCategory.trim(),
            lowStockThreshold: Number(formState.lowStockThreshold) || 0,
            isActive: formState.isActive,
        });
    }
      
    setIsSubmitting(false);
    if (result.success) {
      closeModal();
      await fetchData();
    } else {
      setError(result.message);
    }
  };
  
  const handleOpenDeleteModal = (product: AppSheetProduct) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };
  
  const handleConfirmDelete = async () => {
      if (!productToDelete) return;
      setIsSubmitting(true);
      setError(null);
      const result = await deleteAppSheetProduct(productToDelete.name);
      
      if (result.success) {
          setIsDeleteModalOpen(false);
          setProductToDelete(null);
          await fetchData();
      } else {
          setError(`Delete failed: ${result.message}`);
          // Keep delete modal open to show error
      }
      setIsSubmitting(false);
  };

  const handleToggleDailyCount = async (productName: string, isOnDailyCount: boolean) => {
    setUpdatingDailyCount(prev => new Set(prev).add(productName));
    
    const originalDailyCountProducts = [...dailyCountProducts];
    if (isOnDailyCount) {
        setDailyCountProducts(prev => [...prev, { productID: 'temp', productName, createDate: '', imageUrl: '' }]);
    } else {
        setDailyCountProducts(prev => prev.filter(p => p.productName !== productName));
    }

    const result = await updateDailyCountStatus(productName, isOnDailyCount);

    if (!result.success) {
        setDailyCountProducts(originalDailyCountProducts);
        setError('Failed to update daily count status. Please try again.');
    } else {
        const freshDailyCountProducts = await getProducts();
        setDailyCountProducts(freshDailyCountProducts);
    }

    setUpdatingDailyCount(prev => {
        const newSet = new Set(prev);
        newSet.delete(productName);
        return newSet;
    });
  };

  const handleToggleProductStatus = async (product: AppSheetProduct) => {
      setUpdatingStatus(prev => new Set(prev).add(product.name));
      const newStatus = !product.isActive;
      
      // Optimistic update
      setAppSheetProducts(prev => prev.map(p => p.name === product.name ? { ...p, isActive: newStatus } : p));

      const result = await updateProductStatus(product.name, newStatus);
      
      if (!result.success) {
          // Revert on failure
          setAppSheetProducts(prev => prev.map(p => p.name === product.name ? { ...p, isActive: !newStatus } : p));
          alert(`Failed to update status: ${result.message}`);
      }
      
      setUpdatingStatus(prev => {
          const newSet = new Set(prev);
          newSet.delete(product.name);
          return newSet;
      });
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
      >
        {label}
      </button>
    );
  };

  const handleToggleCategory = (e: React.MouseEvent, category: string) => {
    e.preventDefault();
    setExpandedCategories(prev => {
        const newSet = new Set(prev);
        if (newSet.has(category)) newSet.delete(category);
        else newSet.add(category);
        return newSet;
    });
  };

  const handleToggleSubCategory = (e: React.MouseEvent, subCategoryKey: string) => {
      e.preventDefault();
      setExpandedSubCategories(prev => {
          const newSet = new Set(prev);
          if (newSet.has(subCategoryKey)) newSet.delete(subCategoryKey);
          else newSet.add(subCategoryKey);
          return newSet;
      });
  };

  const handleExpandAll = () => {
      const allCats = Object.keys(groupedProducts);
      const allSubCats: string[] = [];
      allCats.forEach(cat => {
          Object.keys(groupedProducts[cat]).forEach(subCat => {
              allSubCats.push(`${cat}|${subCat}`);
          });
      });
      setExpandedCategories(new Set(allCats));
      setExpandedSubCategories(new Set(allSubCats));
  };

  const handleCollapseAll = () => {
      setExpandedCategories(new Set());
      setExpandedSubCategories(new Set());
  };

  const SortableHeader: React.FC<{ sortKey: SortKey, label: string }> = ({ sortKey, label }) => {
    const isSorted = sortConfig.key === sortKey;
    const directionIcon = isSorted ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '';
    return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <button onClick={() => requestSort(sortKey)} className="flex items-center">
                {label} <span className="ml-1">{directionIcon}</span>
            </button>
        </th>
    );
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-900">Products</h2>
         <div className="flex items-center justify-center min-h-[40vh]">
            <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
            </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold text-gray-900">Product Management</h2>
            <p className="mt-1 text-gray-600">Edit products and manage categories.</p>
        </div>
        {activeTab === 'products' && (
            <button
                onClick={openModalForAdd}
                className="flex items-center justify-center bg-indigo-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-indigo-700 transition-colors w-full sm:w-auto"
            >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Product
            </button>
        )}
      </div>

       <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {renderTabButton('products', 'All Products')}
              {renderTabButton('categories', 'Manage Categories')}
          </nav>
      </div>

      {activeTab === 'categories' ? (
        <CategoryManager />
      ) : (
        <div className="space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                <div className="relative w-full lg:max-w-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="search"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        aria-label="Search products"
                    />
                </div>
                <div className="flex items-center space-x-4 w-full lg:w-auto justify-between lg:justify-end">
                    <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-1.5 rounded-md border shadow-sm">
                        <input 
                            type="checkbox" 
                            checked={showInactive} 
                            onChange={(e) => setShowInactive(e.target.checked)} 
                            className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out" 
                        />
                        <span className="text-sm font-medium text-gray-700">Show Out of Stock Only</span>
                    </label>
                    <div className="flex items-center space-x-2">
                        <button 
                            onClick={() => setViewMode(prev => prev === 'grouped' ? 'table' : 'grouped')} 
                            className="flex items-center px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200"
                        >
                            {viewMode === 'grouped' ? <TableCellsIcon className="h-4 w-4 mr-1.5" /> : <ViewGridIcon className="h-4 w-4 mr-1.5" />}
                            <span>{viewMode === 'grouped' ? 'Table View' : 'Grouped View'}</span>
                        </button>
                        {viewMode === 'grouped' && (
                            <>
                                <button onClick={handleExpandAll} className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md">Expand All</button>
                                <button onClick={handleCollapseAll} className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-md">Collapse All</button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {viewMode === 'grouped' && (
                Object.keys(groupedProducts).length > 0 ? Object.entries(groupedProducts).map(([category, subCategories]) => (
                    <details key={category} open={expandedCategories.has(category)} className="bg-white shadow-md rounded-xl overflow-hidden group transition-all duration-300">
                        <summary className="px-6 py-4 text-xl font-bold text-gray-800 cursor-pointer list-none flex justify-between items-center bg-gray-100 hover:bg-gray-200 transition-colors" onClick={(e) => handleToggleCategory(e, category)}>
                            <span>{category}</span>
                            <ChevronDownIcon className="h-6 w-6 text-gray-500 transform transition-transform duration-200 group-open:rotate-180" />
                        </summary>
                        <div className="p-2 space-y-2 bg-gray-50">
                            {Object.entries(subCategories).map(([subCategory, products]) => {
                                const subCategoryKey = `${category}|${subCategory}`;
                                return (
                                    <details key={subCategoryKey} open={expandedSubCategories.has(subCategoryKey)} className="group/sub">
                                        <summary className="px-4 py-3 text-lg font-semibold text-gray-700 cursor-pointer list-none flex justify-between items-center hover:bg-gray-200/50 rounded-md transition-colors" onClick={(e) => handleToggleSubCategory(e, subCategoryKey)}>
                                            <span>{subCategory}</span>
                                            <ChevronDownIcon className="h-5 w-5 text-gray-500 transform transition-transform duration-200 group-open/sub:rotate-180" />
                                        </summary>
                                        <div className="pl-4 pt-2 space-y-3">
                                            {products.map(product => (
                                                <div key={product.name} className={`bg-white rounded-lg shadow-sm overflow-hidden border ${product.isActive === false ? 'border-red-300 bg-red-50' : ''}`}>
                                                    <div className="p-4 space-y-3">
                                                        <div className="flex justify-between items-start">
                                                            <h3 className="font-bold text-gray-800 flex-1 pr-2">
                                                                {product.name}
                                                                {product.isActive === false && <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-200 text-red-800 rounded">OUT OF STOCK</span>}
                                                            </h3>
                                                            <div className="flex items-center space-x-1 flex-shrink-0">
                                                              <button onClick={() => openModalForEdit(product)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full"><PencilIcon className="h-5 w-5" /></button>
                                                              <button onClick={() => handleOpenDeleteModal(product)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><TrashIcon className="h-5 w-5" /></button>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-bold text-gray-500 uppercase">Colors</h4>
                                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                                {product.colors.map(color => <span key={color} className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">{color}</span>)}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-2 border-t gap-2">
                                                            <div className="text-sm">
                                                                <span className="font-medium text-gray-500">Low Stock At:</span> {product.lowStockThreshold}
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <button 
                                                                    onClick={() => handleToggleProductStatus(product)} 
                                                                    disabled={updatingStatus.has(product.name)}
                                                                    className={`flex items-center px-3 py-1 rounded text-xs font-bold transition-colors ${product.isActive !== false ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                                                                >
                                                                    {product.isActive !== false ? <CheckCircleIcon className="h-4 w-4 mr-1" /> : <XCircleIcon className="h-4 w-4 mr-1" />}
                                                                    {product.isActive !== false ? 'Active' : 'Restock Item'}
                                                                </button>
                                                                
                                                                <label htmlFor={`daily-count-grouped-${product.name}`} className="flex items-center space-x-2 cursor-pointer">
                                                                    <span className="text-sm font-medium text-gray-600">On Daily Count</span>
                                                                    <div className="relative">
                                                                        <input
                                                                            id={`daily-count-grouped-${product.name}`}
                                                                            type="checkbox"
                                                                            className="sr-only"
                                                                            checked={dailyCountProductNames.has(product.name)}
                                                                            onChange={() => handleToggleDailyCount(product.name, !dailyCountProductNames.has(product.name))}
                                                                            disabled={updatingDailyCount.has(product.name)}
                                                                        />
                                                                        <div className={`block w-10 h-6 rounded-full transition-colors ${dailyCountProductNames.has(product.name) ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                                                                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${dailyCountProductNames.has(product.name) ? 'translate-x-4' : ''}`}></div>
                                                                    </div>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                );
                            })}
                        </div>
                    </details>
                )) : (
                     <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow-md">
                        <p>{searchQuery ? `No products found matching "${searchQuery}".` : 'No products found.'}</p>
                    </div>
                )
            )}

            {viewMode === 'table' && (
                <>
                 <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <SortableHeader sortKey="name" label="Item" />
                                    <SortableHeader sortKey="category" label="Category" />
                                    <SortableHeader sortKey="subCategory" label="Sub-Category" />
                                    <SortableHeader sortKey="lowStockThreshold" label="Low Stock At" />
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">On Daily Count</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {sortedProducts.length > 0 ? sortedProducts.map(product => (
                                    <tr key={product.name} className={`odd:bg-white even:bg-gray-50 ${product.isActive === false ? 'bg-red-50' : ''}`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <p className="text-sm font-medium text-gray-900">{product.name}</p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {product.colors.map(color => <span key={color} className="px-1.5 py-0.5 text-xs rounded-full bg-gray-200 text-gray-700">{color}</span>)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.subCategory}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.lowStockThreshold}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button 
                                                onClick={() => handleToggleProductStatus(product)} 
                                                disabled={updatingStatus.has(product.name)}
                                                className={`flex items-center px-2 py-1 rounded text-xs font-bold transition-colors ${product.isActive !== false ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                                            >
                                                {product.isActive !== false ? 'Active' : 'Out of Stock'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <label htmlFor={`daily-count-table-${product.name}`} className="flex items-center cursor-pointer">
                                                <div className="relative">
                                                    <input
                                                        id={`daily-count-table-${product.name}`}
                                                        type="checkbox"
                                                        className="sr-only"
                                                        checked={dailyCountProductNames.has(product.name)}
                                                        onChange={() => handleToggleDailyCount(product.name, !dailyCountProductNames.has(product.name))}
                                                        disabled={updatingDailyCount.has(product.name)}
                                                    />
                                                    <div className={`block w-10 h-6 rounded-full transition-colors ${dailyCountProductNames.has(product.name) ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${dailyCountProductNames.has(product.name) ? 'translate-x-4' : ''}`}></div>
                                                </div>
                                            </label>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                                            <button onClick={() => openModalForEdit(product)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full"><PencilIcon className="h-5 w-5" /></button>
                                            <button onClick={() => handleOpenDeleteModal(product)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><TrashIcon className="h-5 w-5" /></button>
                                        </td>
                                    </tr>
                                )) : (
                                  <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                      {searchQuery ? `No products found matching "${searchQuery}".` : 'No products found.'}
                                    </td>
                                  </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                 </div>
                 <div className="md:hidden space-y-3">
                    {sortedProducts.length > 0 ? sortedProducts.map(product => (
                        <div key={product.name} className={`bg-white rounded-lg shadow-sm overflow-hidden border p-4 space-y-3 ${product.isActive === false ? 'border-red-300 bg-red-50' : ''}`}>
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-gray-800 flex-1 pr-2">
                                    {product.name}
                                    {product.isActive === false && <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-200 text-red-800 rounded">OUT OF STOCK</span>}
                                </h3>
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                    <button onClick={() => openModalForEdit(product)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full"><PencilIcon className="h-5 w-5" /></button>
                                    <button onClick={() => handleOpenDeleteModal(product)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><TrashIcon className="h-5 w-5" /></button>
                                </div>
                            </div>
                            <div className="text-sm space-y-2 pt-2 border-t">
                                <p><span className="font-medium text-gray-500">Category:</span> {product.category} &gt; {product.subCategory}</p>
                                <p><span className="font-medium text-gray-500">Low Stock At:</span> {product.lowStockThreshold}</p>
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase">Colors</h4>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {product.colors.map(color => <span key={color} className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">{color}</span>)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t">
                                <button 
                                    onClick={() => handleToggleProductStatus(product)} 
                                    disabled={updatingStatus.has(product.name)}
                                    className={`flex items-center px-3 py-1 rounded text-xs font-bold transition-colors ${product.isActive !== false ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                                >
                                    {product.isActive !== false ? 'Active' : 'Restock'}
                                </button>
                                
                                <label htmlFor={`daily-count-mobile-${product.name}`} className="flex items-center space-x-2 cursor-pointer">
                                    <span className="text-sm font-medium text-gray-600">On Daily Count</span>
                                    <div className="relative">
                                        <input
                                            id={`daily-count-mobile-${product.name}`}
                                            type="checkbox"
                                            className="sr-only"
                                            checked={dailyCountProductNames.has(product.name)}
                                            onChange={() => handleToggleDailyCount(product.name, !dailyCountProductNames.has(product.name))}
                                            disabled={updatingDailyCount.has(product.name)}
                                        />
                                        <div className={`block w-10 h-6 rounded-full transition-colors ${dailyCountProductNames.has(product.name) ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${dailyCountProductNames.has(product.name) ? 'translate-x-4' : ''}`}></div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )) : (
                      <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow-md">
                        <p>{searchQuery ? `No products found matching "${searchQuery}".` : 'No products found.'}</p>
                      </div>
                    )}
                 </div>
                </>
            )}
        </div>
      )}
      
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingProduct ? `Edit: ${editingProduct.name}` : 'Add Product'}>
        <div className="space-y-4">
            <div>
                <div className="flex justify-between items-center">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Item Name</label>
                    {editingProduct && (
                        <button onClick={() => setIsNameColorEditable(p => !p)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500" aria-label={isNameColorEditable ? 'Lock name and colors' : 'Unlock name and colors'}>
                            {isNameColorEditable ? <LockOpenIcon className="h-5 w-5"/> : <LockClosedIcon className="h-5 w-5"/>}
                        </button>
                    )}
                </div>
                <input type="text" id="name" name="name" value={formState.name} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500" required disabled={!isNameColorEditable || isSubmitting} />
            </div>
            {editingProduct && isNameColorEditable && (
                <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-sm rounded-r-md">
                    <p><strong>Warning:</strong> Changing the Item Name or Colors will apply these changes across all systems where this product is used.</p>
                </div>
            )}
            <div>
                <label htmlFor="colors" className="block text-sm font-medium text-gray-700">Colors</label>
                <div className={`mt-1 flex flex-wrap items-center gap-2 p-2 border rounded-md min-h-[42px] ${!isNameColorEditable ? 'bg-gray-100' : 'border-gray-300'}`}>
                    {formState.colors.map(color => (
                        <span key={color} className="flex items-center gap-1.5 bg-indigo-100 text-indigo-800 text-sm font-medium px-2.5 py-1 rounded-full">
                            {color}
                            {isNameColorEditable && <button type="button" onClick={() => removeColor(color)} className="text-indigo-600 hover:text-indigo-800" aria-label={`Remove ${color}`}><XIcon className="h-4 w-4" /></button>}
                        </span>
                    ))}
                    {isNameColorEditable && (
                        <input
                            type="text"
                            value={colorInput}
                            onChange={e => setColorInput(e.target.value)}
                            onKeyDown={handleColorInputKeyDown}
                            placeholder="Add color..."
                            className="flex-grow p-1 border-0 focus:ring-0 sm:text-sm bg-transparent"
                            disabled={isSubmitting}
                        />
                    )}
                </div>
                {isNameColorEditable && <p className="mt-1 text-xs text-gray-500">Type a color and press Enter to add it as a tag.</p>}
            </div>
            <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                <select
                    id="category"
                    name="category"
                    value={formState.category}
                    onChange={handleCategoryChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    disabled={isSubmitting}
                >
                    <option value="">Select Category</option>
                    {Object.keys(categoryOptions).sort().map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>
             <div>
                <label htmlFor="subCategory" className="block text-sm font-medium text-gray-700">Sub-Category</label>
                <select
                    id="subCategory"
                    name="subCategory"
                    value={formState.subCategory}
                    onChange={handleFormChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    disabled={isSubmitting || !formState.category}
                >
                    <option value="">Select Sub-Category</option>
                    {(categoryOptions[formState.category] || []).map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-gray-700">Low Stock Threshold</label>
                <input type="number" id="lowStockThreshold" name="lowStockThreshold" value={formState.lowStockThreshold} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" disabled={isSubmitting} />
            </div>
            
            <div className="pt-2">
                <label htmlFor="isActive" className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-gray-50 border border-transparent transition-colors">
                    <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input 
                            type="checkbox" 
                            name="isActive" 
                            id="isActive" 
                            checked={formState.isActive} 
                            onChange={handleFormChange} 
                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                            disabled={isSubmitting}
                            style={{ 
                                right: formState.isActive ? '0' : 'auto', 
                                left: formState.isActive ? 'auto' : '0',
                                borderColor: formState.isActive ? '#4F46E5' : '#D1D5DB' 
                            }}
                        />
                        <label 
                            htmlFor="isActive" 
                            className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${formState.isActive ? 'bg-indigo-600' : 'bg-gray-300'}`}
                        ></label>
                    </div>
                    <div>
                        <span className="text-sm font-medium text-gray-700">{formState.isActive ? 'Product is Active' : 'Product is Out of Stock'}</span>
                        <p className="text-xs text-gray-500">{formState.isActive ? 'Managers can see and order this item.' : 'This item will be blocked from new orders.'}</p>
                    </div>
                </label>
            </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end space-x-2 pt-2">
            <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300" disabled={isSubmitting}>
              Cancel
            </button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => { if(!isSubmitting) setIsDeleteModalOpen(false) }}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"? This will remove it from the main product list and cannot be undone.`}
        isConfirming={isSubmitting}
        confirmText="Delete"
      />
    </div>
  );
};

export default ProductList;
