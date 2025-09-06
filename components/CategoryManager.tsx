import React, { useState, useEffect, useCallback } from 'react';
import { ProductCategory } from '../types';
import { getProductCategories } from '../services/dataService';
import { addCategory, updateCategory } from '../services/writeService';
import Modal from './Modal';
import { PencilIcon, PlusIcon } from './icons';

const CategoryManager: React.FC = () => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  
  const [categoryName, setCategoryName] = useState('');
  const [subCategoryName, setSubCategoryName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProductCategories();
      const sortedData = data.sort((a, b) => a.category.localeCompare(b.category) || a.subCategory.localeCompare(b.subCategory));
      setCategories(sortedData);
    } catch (err) {
      console.error("Failed to fetch categories", err);
      setError('Failed to fetch categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openModalForAdd = () => {
    setEditingCategory(null);
    setCategoryName('');
    setSubCategoryName('');
    setError(null);
    setIsModalOpen(true);
  };

  const openModalForEdit = (category: ProductCategory) => {
    setEditingCategory(category);
    setCategoryName(category.category);
    setSubCategoryName(category.subCategory);
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setCategoryName('');
    setSubCategoryName('');
  };

  const handleSave = async () => {
    if (!categoryName.trim() || !subCategoryName.trim()) {
      setError('Category and Sub-Category names cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = editingCategory
      ? await updateCategory({ ...editingCategory, category: categoryName, subCategory: subCategoryName })
      : await addCategory({ category: categoryName, subCategory: subCategoryName });

    setIsSubmitting(false);

    if (result.success) {
      closeModal();
      await fetchCategories();
    } else {
      setError(result.message);
    }
  };

  if (loading) {
     return (
        <div className="flex items-center justify-center min-h-[40vh]">
            <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="mt-4 text-gray-600">Loading categories...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
            <h3 className="text-xl font-bold text-gray-800">Product Categories</h3>
            <p className="text-sm text-gray-500">Add, edit, or remove the categories used for product organization.</p>
        </div>
        <button
          onClick={openModalForAdd}
          className="flex items-center justify-center bg-indigo-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-indigo-700 transition-colors w-full sm:w-auto"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Category
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sub-Categories</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categories.map((cat) => (
                <tr key={cat.categoryID} className="odd:bg-white even:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cat.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div className="flex flex-wrap gap-1">
                        {cat.subCategory.split(',').map(sub => sub.trim()).filter(Boolean).map(sub => (
                            <span key={sub} className="px-2 py-1 text-xs font-semibold leading-4 rounded-full bg-gray-100 text-gray-800">
                                {sub}
                            </span>
                        ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right space-x-2">
                    <button onClick={() => openModalForEdit(cat)} className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-100">
                      <PencilIcon className="h-5 w-5"/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {categories.map(cat => (
             <div key={cat.categoryID} className="bg-white rounded-lg shadow-md p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-gray-800">{cat.category}</h3>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                        <button onClick={() => openModalForEdit(cat)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full"><PencilIcon className="h-5 w-5" /></button>
                    </div>
                </div>
                <div className="border-t pt-3">
                     <h4 className="text-sm font-medium text-gray-500 mb-1">Sub-Categories</h4>
                    <div className="flex flex-wrap gap-1.5">
                       {cat.subCategory.split(',').map(sub => sub.trim()).filter(Boolean).map(sub => (
                            <span key={sub} className="px-2 py-1 text-xs font-semibold leading-4 rounded-full bg-gray-100 text-gray-800">
                                {sub}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCategory ? 'Edit Category' : 'Add New Category'}>
        <div className="space-y-4">
          <div>
            <label htmlFor="category-name" className="block text-sm font-medium text-gray-700">Category Name</label>
            <input
              type="text"
              id="category-name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., Clothing"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="sub-category-name" className="block text-sm font-medium text-gray-700">Sub-Category Names</label>
            <textarea
              id="sub-category-name"
              value={subCategoryName}
              onChange={(e) => setSubCategoryName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., T-Shirts, Hoodies, Socks"
              rows={3}
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500">Enter multiple sub-categories separated by commas.</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end space-x-2 pt-2">
            <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300" disabled={isSubmitting}>
              Cancel
            </button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CategoryManager;