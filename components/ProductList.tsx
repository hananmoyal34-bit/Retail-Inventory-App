import React, { useState, useEffect, useMemo } from 'react';
import { Product, InventoryLog } from '../types';
import { getProducts, getInventoryLogs } from '../services/dataService';
import ProductDescriptionGenerator from './ProductDescriptionGenerator';

const LOW_STOCK_THRESHOLD = 10;

interface ProductListProps {
  filter?: 'low_stock';
}

const ProductList: React.FC<ProductListProps> = ({ filter }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [productsData, logsData] = await Promise.all([
          getProducts(),
          getInventoryLogs(),
        ]);
        setProducts(productsData);
        setInventoryLogs(logsData);
      } catch (error) {
        console.error("Failed to fetch product data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stockLevels = useMemo(() => {
    const stockMap = new Map<string, number>();
    inventoryLogs.forEach(log => {
      stockMap.set(log.productName, (stockMap.get(log.productName) || 0) + log.quantity);
    });
    return stockMap;
  }, [inventoryLogs]);

  const filteredProducts = useMemo(() => {
    if (filter === 'low_stock') {
      return products.filter(product => {
        const stock = stockLevels.get(product.productName) || 0;
        return stock <= LOW_STOCK_THRESHOLD;
      });
    }
    return products;
  }, [products, stockLevels, filter]);


  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-900">{filter === 'low_stock' ? 'Low Stock Products' : 'Products'}</h2>
        <p>Loading products...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">{filter === 'low_stock' ? 'Low Stock Products' : 'Products'}</h2>
        {/*
          NOTE: Add product functionality is disabled because writing to Google Sheets
          from the client-side requires insecure credential handling or a complex
          OAuth2 setup. This component is now read-only.
        */}
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Tools</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Create Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.length > 0 ? filteredProducts.map((product) => {
                const stock = stockLevels.get(product.productName) || 0;
                const isLowStock = stock <= LOW_STOCK_THRESHOLD;
                return (
                  <tr key={product.productID} className={isLowStock ? 'bg-yellow-100' : 'odd:bg-white even:bg-gray-50'}>
                    <td className="px-6 py-4">
                      <img src={product.imageUrl} alt={product.productName} className="h-12 w-12 object-cover rounded-md" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{product.productName}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-800'}`}>
                      {stock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <ProductDescriptionGenerator productName={product.productName} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.createDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.productID}</td>
                  </tr>
                );
              }) : (
                 <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500">
                    {filter === 'low_stock' ? 'No products with low stock.' : 'No products found.'}
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

export default ProductList;