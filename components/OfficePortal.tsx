import React, { useState, useEffect } from 'react';
import { User } from '../types';
import ProductList from './ProductList';
import InventoryCount from './InventoryCount';
import Orders from './Orders';
import InventoryLog from './InventoryLog';
import WarehouseInventory from './WarehouseInventory';
import { BoxIcon, ClipboardListIcon, LoginIcon, TableCellsIcon, TruckIcon, WarehouseIcon, XIcon } from './icons';
import OfficeMobileNavMenu from './OfficeMobileNavMenu';
import { getAppSheetProducts } from '../services/dataService';

interface LogisticsPortalProps {
  user: User;
  onLogout: () => void;
}

type OfficePage = 'Orders' | 'Products' | 'Count' | 'Warehouse Inventory' | 'Locations Inventory';

const LogisticsPortal: React.FC<LogisticsPortalProps> = ({ user, onLogout }) => {
  const [activePage, setActivePage] = useState<OfficePage>('Orders');
  const [hasUncategorized, setHasUncategorized] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    const checkProducts = async () => {
        try {
            const products = await getAppSheetProducts();
            const uncategorizedExists = products.some(p => !p.category);
            setHasUncategorized(uncategorizedExists);
        } catch (error) {
            console.error("Failed to check for uncategorized products", error);
        }
    };
    checkProducts();
  }, []);

  const navItems: { id: OfficePage; label: string; icon: React.ReactNode }[] = [
    { id: 'Orders', label: 'Orders', icon: <TruckIcon className="h-5 w-5" /> },
    { id: 'Count', label: 'Count', icon: <TableCellsIcon className="h-5 w-5" /> },
    { id: 'Warehouse Inventory', label: 'Warehouse', icon: <WarehouseIcon className="h-5 w-5" /> },
    { id: 'Locations Inventory', label: 'Locations', icon: <ClipboardListIcon className="h-5 w-5" /> },
    { id: 'Products', label: 'Products', icon: <BoxIcon className="h-5 w-5" /> },
  ];

  const renderPage = () => {
    switch (activePage) {
      case 'Orders': return <Orders />;
      case 'Products': return <ProductList />;
      case 'Count': return <InventoryCount />;
      case 'Warehouse Inventory': return <WarehouseInventory />;
      case 'Locations Inventory': return <InventoryLog />;
      default: return <Orders />;
    }
  };

  return (
    <div className="min-h-screen font-sans text-gray-800">
      <header className="bg-white/70 backdrop-blur-lg shadow-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-indigo-600">Inv<span className="text-gray-700">Sys</span></span>
              <span className="ml-4 text-sm font-medium text-gray-500 border-l pl-4">Logistics Portal</span>
            </div>
            <div className="flex items-center">
              <span className="hidden sm:inline text-sm text-gray-700 mr-4">Welcome, {user.name}</span>
              <button
                onClick={onLogout}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                <LoginIcon className="h-5 w-5 mr-1 transform -scale-x-100" />
                Logout
              </button>
            </div>
          </div>
          <nav className="hidden md:flex space-x-4 border-t overflow-x-auto">
            {navItems.map(item => (
                <button
                    key={item.id}
                    onClick={() => setActivePage(item.id)}
                    className={`flex items-center gap-2 whitespace-nowrap py-3 px-4 text-sm font-medium ${
                        activePage === item.id
                        ? 'border-b-2 border-indigo-500 text-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    {item.icon}
                    {item.label}
                </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
        {hasUncategorized && showBanner && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-6 rounded-md shadow-md flex justify-between items-center" role="alert">
                <div>
                    <p className="font-bold">Urgent Action Required</p>
                    <p>There are products in the system without an assigned category. Please go to the "Products" page to assign categories immediately to ensure proper inventory tracking.</p>
                </div>
                <button onClick={() => setShowBanner(false)} className="p-1 rounded-full hover:bg-yellow-200" aria-label="Dismiss message">
                    <XIcon className="h-5 w-5" />
                </button>
            </div>
        )}
        {renderPage()}
      </main>
      <OfficeMobileNavMenu activePage={activePage} setActivePage={setActivePage} onLogout={onLogout} />
    </div>
  );
};

export default LogisticsPortal;