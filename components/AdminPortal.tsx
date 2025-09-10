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
import { initializeAppConfig } from '../services/dataService';
import CountLog from './CountLog';
import TransactionLogs from './TransactionLogs';
import ViewerPortal from './viewer/ViewerPortal';

interface AdminPortalProps {
  onLogout: () => void;
}

const AdminPortal: React.FC<AdminPortalProps> = ({ onLogout }) => {
  const [activePage, setActivePage] = useState<Page>(Page.DASHBOARD);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      await initializeAppConfig();
      setIsInitialized(true);
    };
    initializeApp();
  }, []);

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
        {renderPage()}
      </main>
      <MobileNavMenu activePage={activePage} setActivePage={setActivePage} onLogout={onLogout} />
    </div>
  );
};

export default AdminPortal;