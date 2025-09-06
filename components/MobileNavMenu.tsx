import React, { useState } from 'react';
import { Page } from '../types';
import { 
    HomeIcon, 
    TableCellsIcon, 
    ClipboardListIcon, 
    TruckIcon, 
    ViewGridIcon, 
    XIcon,
    CogIcon,
    BoxIcon,
    LocationMarkerIcon,
    UsersIcon,
    LoginIcon,
    QuestionMarkCircleIcon,
    ChevronDownIcon,
    WarehouseIcon
} from './icons';

interface MobileNavMenuProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  onLogout: () => void;
}

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
    { id: Page.CUSTOMER_SERVICE, label: 'Customer Service', icon: <QuestionMarkCircleIcon /> },
];

const MobileNavMenu: React.FC<MobileNavMenuProps> = ({ activePage, setActivePage, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);

  const handleNavigation = (page: Page) => {
    setActivePage(page);
    setIsOpen(false);
    // When a manage item is clicked, also close the manage sub-menu for next time
    setIsManageOpen(false); 
  };
  
  const isManagePageActive = manageNavItems.some(item => item.id === activePage);

  return (
    // This component is only visible on screens smaller than md (768px)
    <div className="md:hidden">
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-40 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-110"
        aria-label="Open main menu"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <ViewGridIcon className="h-6 w-6" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      {/* Bottom Sheet Menu */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl rounded-t-2xl shadow-top transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="main-menu-title"
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 id="main-menu-title" className="text-lg font-bold text-gray-800">Admin Menu</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-gray-500 hover:bg-black/10 rounded-full"
              aria-label="Close menu"
            >
              <XIcon className="h-6 w-6" />
            </button>
          </div>
          <nav>
            <ul className="space-y-2">
              {mainNavItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigation(item.id)}
                    className={`w-full flex items-center p-3 rounded-lg text-left text-base font-medium transition-colors ${
                      activePage === item.id
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-700 hover:bg-black/5'
                    }`}
                  >
                    {React.cloneElement(item.icon, { className: 'h-6 w-6 mr-4' })}
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
              {/* Manage Accordion */}
              <li>
                 <button
                    onClick={() => setIsManageOpen(!isManageOpen)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left text-base font-medium transition-colors ${
                      isManagePageActive
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-700 hover:bg-black/5'
                    }`}
                  >
                    <div className="flex items-center">
                        <CogIcon className="h-6 w-6 mr-4" />
                        <span>Manage</span>
                    </div>
                    <ChevronDownIcon className={`h-5 w-5 transition-transform ${isManageOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isManageOpen && (
                    <div className="pl-8 pt-2 space-y-2">
                         {manageNavItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleNavigation(item.id)}
                                className={`w-full flex items-center p-3 rounded-lg text-left text-base font-medium transition-colors ${
                                activePage === item.id
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'text-gray-700 hover:bg-black/5'
                                }`}
                            >
                                {React.cloneElement(item.icon, { className: 'h-6 w-6 mr-4' })}
                                <span>{item.label}</span>
                            </button>
                         ))}
                    </div>
                  )}
              </li>
               <li className="pt-2 border-t mt-2">
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center p-3 rounded-lg text-left text-base font-medium text-red-600 hover:bg-red-50"
                  >
                    <LoginIcon className="h-6 w-6 mr-4 transform -scale-x-100" />
                    <span>Logout</span>
                  </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default MobileNavMenu;