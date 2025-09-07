import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppSheetProduct, ProductCategory } from '../types';
import { getAppSheetProducts, getProductCategories } from '../services/dataService';
import { updateAppSheetProduct } from '../services/writeService';
import CategoryManager from './CategoryManager';
import Modal from './Modal';
import { PencilIcon, ChevronDownIcon, ViewGridIcon, TableCellsIcon, SearchIcon } from './icons';

type ViewMode = 'grouped' | 'table';
type SortKey = keyof AppSheetProduct;

const ProductList: React.FC = () => {
  const [appSheetProducts, setAppSheetProducts] = useState<AppSheetProduct[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState('');


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AppSheetProduct | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    colors: '',
    category: '',
    subCategory: '',
    lowStockThreshold: 10,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for collapsible sections
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubCategories, setExpandedSubCategories] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [appSheetProductsData, categoriesData] = await Promise.all([
        getAppSheetProducts(),
        getProductCategories(),
      ]);
      setAppSheetProducts(appSheetProductsData);
      setProductCategories(categoriesData);
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
    if (!searchQuery.trim()) {
      return appSheetProducts;
    }
    return appSheetProducts.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [appSheetProducts, searchQuery]);

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


  const openModalForEdit = (product: AppSheetProduct) => {
    setEditingProduct(product);
    setFormState({
      name: product.name,
      colors: product.colors.join(', '),
      category: product.category,
      subCategory: product.subCategory,
      lowStockThreshold: product.lowStockThreshold,
    });
    setError(null);
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  }

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    setFormState(prev => ({
        ...prev,
        category: newCategory,
        subCategory: '', // Reset sub-category when category changes
    }));
  };

  const handleSave = async () => {
    if (!formState.name.trim()) {
      setError('Product name cannot be empty.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const result = await updateAppSheetProduct({
        name: formState.name,
        category: formState.category.trim(),
        subCategory: formState.subCategory.trim(),
        lowStockThreshold: Number(formState.lowStockThreshold) || 0,
    });
      
    setIsSubmitting(false);
    if (result.success) {
      closeModal();
      await fetchData();
    } else {
      setError(result.message);
    }
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

  // --- Expansion Handlers ---
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
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:max-w-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="search"
                        placeholder="Search products by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        aria-label="Search products"
                    />
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
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
                                                <div key={product.name} className="bg-white rounded-lg shadow-sm overflow-hidden border">
                                                    <div className="p-4 space-y-3">
                                                        <div className="flex justify-between items-start">
                                                            <h3 className="font-bold text-gray-800 flex-1 pr-2">{product.name}</h3>
                                                            <div className="flex items-center space-x-1 flex-shrink-0">
                                                              <button onClick={() => openModalForEdit(product)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full"><PencilIcon className="h-5 w-5" /></button>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-bold text-gray-500 uppercase">Colors</h4>
                                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                                {product.colors.map(color => <span key={color} className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">{color}</span>)}
                                                            </div>
                                                        </div>
                                                        <div className="text-sm pt-2 border-t">
                                                            <span className="font-medium text-gray-500">Low Stock At:</span> {product.lowStockThreshold}
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
                        <p>{searchQuery ? `No products found for "${searchQuery}".` : 'No products found.'}</p>
                    </div>
                )
            )}

            {viewMode === 'table' && (
                <>
                 {/* Desktop & Tablet Table View */}
                 <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <SortableHeader sortKey="name" label="Item" />
                                    <SortableHeader sortKey="category" label="Category" />
                                    <SortableHeader sortKey="subCategory" label="Sub-Category" />
                                    <SortableHeader sortKey="lowStockThreshold" label="Low Stock At" />
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {sortedProducts.length > 0 ? sortedProducts.map(product => (
                                    <tr key={product.name} className="odd:bg-white even:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <p className="text-sm font-medium text-gray-900">{product.name}</p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {product.colors.map(color => <span key={color} className="px-1.5 py-0.5 text-xs rounded-full bg-gray-200 text-gray-700">{color}</span>)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.subCategory}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.lowStockThreshold}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                                            <button onClick={() => openModalForEdit(product)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full"><PencilIcon className="h-5 w-5" /></button>
                                        </td>
                                    </tr>
                                )) : (
                                  <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                      {searchQuery ? `No products found for "${searchQuery}".` : 'No products found.'}
                                    </td>
                                  </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                 </div>
                 {/* Mobile Card View */}
                 <div className="md:hidden space-y-3">
                    {sortedProducts.length > 0 ? sortedProducts.map(product => (
                        <div key={product.name} className="bg-white rounded-lg shadow-sm overflow-hidden border p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-gray-800 flex-1 pr-2">{product.name}</h3>
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                    <button onClick={() => openModalForEdit(product)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full"><PencilIcon className="h-5 w-5" /></button>
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
                        </div>
                    )) : (
                      <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow-md">
                        <p>{searchQuery ? `No products found for "${searchQuery}".` : 'No products found.'}</p>
                      </div>
                    )}
                 </div>
                </>
            )}
        </div>
      )}
      
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingProduct ? `Edit: ${editingProduct.name}` : 'Edit Product'}>
        <div className="space-y-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Item Name</label>
                <input type="text" id="name" name="name" value={formState.name} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500" required disabled={isSubmitting || !!editingProduct} />
            </div>
             <div>
                <label htmlFor="colors" className="block text-sm font-medium text-gray-700">Colors</label>
                <input type="text" id="colors" name="colors" value={formState.colors} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500" required disabled={isSubmitting || !!editingProduct} />
                <p className="mt-1 text-xs text-gray-500">Enter multiple colors separated by commas.</p>
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
    </div>
  );
};

export default ProductList;