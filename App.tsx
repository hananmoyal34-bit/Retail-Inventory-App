import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ProductList from './components/ProductList';
import InventoryCount from './components/InventoryCount';
import Users from './components/Users';
import Orders from './components/Orders';
import InventoryLog from './components/InventoryLog';
import WarehouseInventory from './components/WarehouseInventory';
import Locations from './components/Locations';
import LoginPortal from './components/LoginPortal';
import CustomerService from './components/CustomerService';
import MobileNavMenu from './components/MobileNavMenu';
import { Page } from './types';
import { initializeAppConfig } from './services/dataService';

const App: React.FC = () => {
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
      case Page.LOW_STOCK_PRODUCTS:
        return <ProductList filter="low_stock" />;
      case Page.COUNT:
        return <InventoryCount />;
      case Page.WAREHOUSE_INVENTORY:
        return <WarehouseInventory />;
      case Page.INVENTORY_LOG:
        return <InventoryLog />;
      case Page.USERS:
        return <Users />;
      case Page.ORDERS:
        return <Orders />;
      case Page.LOCATIONS:
        return <Locations />;
      case Page.LOGIN_PORTAL:
        return <LoginPortal />;
      case Page.CUSTOMER_SERVICE:
        return <CustomerService />;
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
      <Header activePage={activePage} setActivePage={setActivePage} />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
        {renderPage()}
      </main>
      <MobileNavMenu activePage={activePage} setActivePage={setActivePage} />
    </div>
  );
};

export default App;