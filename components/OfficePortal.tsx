import React, { useState } from 'react';
import { User } from '../types';
import ProductList from './ProductList';
import InventoryCount from './InventoryCount';
import Orders from './Orders';
import InventoryLog from './InventoryLog';
import WarehouseInventory from './WarehouseInventory';
import { BoxIcon, ClipboardListIcon, LoginIcon, TableCellsIcon, TruckIcon, WarehouseIcon } from './icons';
import OfficeMobileNavMenu from './OfficeMobileNavMenu';

interface OfficePortalProps {
  user: User;
  onLogout: () => void;
}

type OfficePage = 'Orders' | 'Products' | 'Count' | 'Warehouse Inventory' | 'Locations Inventory';

const OfficePortal: React.FC<OfficePortalProps> = ({ user, onLogout }) => {
  const [activePage, setActivePage] = useState<OfficePage>('Orders');

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
              <span className="ml-4 text-sm font-medium text-gray-500 border-l pl-4">Office Portal</span>
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
        {renderPage()}
      </main>
      <OfficeMobileNavMenu activePage={activePage} setActivePage={setActivePage} onLogout={onLogout} />
    </div>
  );
};

export default OfficePortal;