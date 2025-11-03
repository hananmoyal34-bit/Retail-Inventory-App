import React, { useState, useEffect } from 'react';
import Header from './Header';
import Dashboard from './Dashboard';
import ProductList from './ProductList';
import InventoryCount from './InventoryCount';
import Users from './Users';
import Orders from './Orders';
import WarehouseInventory from './WarehouseInventory';
import Locations from './Locations';
import MobileNavMenu from './MobileNavMenu';
import { Page } from '../types';
import { initializeAppConfig, getAppSheetProducts } from '../services/dataService';
import CountLog from './CountLog';
import TransactionLogs from './TransactionLogs';
import ViewerPortal from './viewer/ViewerPortal';
import { XIcon } from './icons';

interface AdminPortalProps {
  onLogout: () => void;
}

const AdminPortal: React.FC<AdminPortalProps> = ({ onLogout }) => {
  const [activePage, setActivePage] = useState<Page>(Page.DASHBOARD);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasUncategorized, setHasUncategorized] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      await initializeAppConfig();
      setIsInitialized(true);
    };
    initializeApp();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

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
  }, [isInitialized]);

  const renderPage = () => {
    switch (activePage) {
      case Page.DASHBOARD:
        return <Dashboard setActivePage={setActivePage} />;
      case Page.PRODUCTS:
        return <ProductList />;
      case Page.COUNT:
        return <InventoryCount />;
      case Page.WAREHOUSE_INVENTORY:
        return <WarehouseInventory />;
      case Page.TRANSACTION_LOGS:
        return <TransactionLogs />;
      case Page.COUNT_LOG:
        return <CountLog />;
      case Page.USERS:
        return <Users />;
      case Page.ORDERS:
        return <Orders />;
      case Page.LOCATIONS:
        return <Locations />;
      case Page.VIEWER_CS_HUB:
      case Page.VIEWER_FINANCING:
      case Page.VIEWER_ACCOUNTS:
      case Page.VIEWER_TASKS:
      case Page.VIEWER_DIRECTORY:
        return <ViewerPortal activePage={activePage} />;
      default:
        return <Dashboard setActivePage={setActivePage} />;
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-lg text-gray-600">Initializing Application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans text-gray-800">
      <Header activePage={activePage} setActivePage={setActivePage} onLogout={onLogout} />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
        {hasUncategorized && showBanner && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-6 rounded-md shadow-md flex justify-between items-center" role="alert">
                <div>
                    <p className="font-bold">Urgent Action Required</p>
                    <p>There are products in the system without an assigned category. Please go to the "Manage" &gt; "Products" page to assign categories immediately to ensure proper inventory tracking.</p>
                </div>
                <button onClick={() => setShowBanner(false)} className="p-1 rounded-full hover:bg-yellow-200" aria-label="Dismiss message">
                    <XIcon className="h-5 w-5" />
                </button>
            </div>
        )}
        {renderPage()}
      </main>
      <MobileNavMenu activePage={activePage} setActivePage={setActivePage} onLogout={onLogout} />
    </div>
  );
};

export default AdminPortal;