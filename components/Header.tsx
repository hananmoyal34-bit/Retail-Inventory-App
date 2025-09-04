import React, { useState, useRef, useEffect } from 'react';
import { Page } from '../types';
import { BoxIcon, ClipboardListIcon, CogIcon, ChevronDownIcon, HomeIcon, LocationMarkerIcon, LoginIcon, QuestionMarkCircleIcon, TableCellsIcon, TruckIcon, UsersIcon, WarehouseIcon } from './icons';
import Tooltip from './Tooltip';

interface HeaderProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
}

const Header: React.FC<HeaderProps> = ({ activePage, setActivePage }) => {
  const [isManageMenuOpen, setManageMenuOpen] = useState(false);
  const manageMenuRef = useRef<HTMLDivElement>(null);

  const mainNavItems = [
    { id: Page.DASHBOARD, label: 'Dashboard', icon: <HomeIcon /> },
    { id: Page.ORDERS, label: 'Orders', icon: <TruckIcon /> },
    { id: Page.COUNT, label: 'Count', icon: <TableCellsIcon /> },
    { id: Page.WAREHOUSE_INVENTORY, label: 'Warehouse Inventory', icon: <WarehouseIcon /> },
    { id: Page.INVENTORY_LOG, label: 'Locations Inventory', icon: <ClipboardListIcon /> },
  ];

  const manageNavItems = [
    { id: Page.PRODUCTS, label: 'Products', icon: <BoxIcon /> },
    { id: Page.LOCATIONS, label: 'Locations', icon: <LocationMarkerIcon /> },
    { id: Page.USERS, label: 'Users', icon: <UsersIcon /> },
    { id: Page.LOGIN_PORTAL, label: 'Login Portal', icon: <LoginIcon /> },
    { id: Page.CUSTOMER_SERVICE, label: 'Customer Service', icon: <QuestionMarkCircleIcon /> },
  ];

  const isManagePageActive = manageNavItems.some(item => item.id === activePage);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Fix: Corrected typo from 'manageMenur' to 'manageMenuRef'
      if (manageMenuRef.current && !manageMenuRef.current.contains(event.target as Node)) {
        setManageMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // FIX: Explicitly typed icon props as 'any' to resolve error when passing 'className' with React.cloneElement.
  const NavButton: React.FC<{ item: { id: Page, label: string, icon: React.ReactElement<any> }, isMain?: boolean }> = ({ item, isMain = true }) => {
    const isActive = activePage === item.id;
    const className = isMain 
      ? `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive ? 'border-indigo-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`
      : `w-full text-left flex items-center px-4 py-2 text-sm ${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} hover:bg-gray-100 hover:text-gray-900`;

    return (
        <button
            onClick={() => {
                setActivePage(item.id);
                if (!isMain) setManageMenuOpen(false);
            }}
            className={className}
        >
            {!isMain && item.icon && React.cloneElement(item.icon, { className: "mr-3 h-5 w-5 text-gray-400"})}
            {item.label}
        </button>
    );
  };

  return (
    <header className="bg-white/70 backdrop-blur-lg shadow-sm sticky top-0 z-30 hidden md:block">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
                <span className="text-2xl font-bold text-indigo-600">Inv<span className="text-gray-700">Sys</span></span>
            </div>
            <nav className="hidden md:flex md:ml-10 md:space-x-8">
              {mainNavItems.map(item => (
                <NavButton key={item.id} item={item} />
              ))}
              <div className="relative" ref={manageMenuRef}>
                 <button
                  onClick={() => setManageMenuOpen(!isManageMenuOpen)}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isManagePageActive
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                    <CogIcon className="h-5 w-5 mr-1" />
                  <span>Manage</span>
                  <ChevronDownIcon className={`ml-1 h-5 w-5 transition-transform ${isManageMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isManageMenuOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="py-1">
                            {manageNavItems.map(item => (
                                <NavButton key={item.id} item={item} isMain={false} />
                            ))}
                        </div>
                    </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;