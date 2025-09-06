
import React, { useState } from 'react';
import {
    BoxIcon, ClipboardListIcon, LoginIcon, TableCellsIcon, TruckIcon, WarehouseIcon,
    ViewGridIcon, XIcon
} from './icons';

type OfficePage = 'Orders' | 'Products' | 'Count' | 'Warehouse Inventory' | 'Locations Inventory';

interface OfficeMobileNavMenuProps {
  activePage: OfficePage;
  setActivePage: (page: OfficePage) => void;
  onLogout: () => void;
}

// FIX: Changed icon type from React.ReactNode to React.ReactElement for compatibility with React.cloneElement
// FIX: Explicitly type icon props with `<any>` to allow passing `className` via `React.cloneElement`, resolving the TypeScript error.
const navItems: { id: OfficePage; label: string; icon: React.ReactElement<any> }[] = [
    { id: 'Orders', label: 'Orders', icon: <TruckIcon /> },
    { id: 'Count', label: 'Count', icon: <TableCellsIcon /> },
    { id: 'Warehouse Inventory', label: 'Warehouse', icon: <WarehouseIcon /> },
    { id: 'Locations Inventory', label: 'Locations', icon: <ClipboardListIcon /> },
    { id: 'Products', label: 'Products', icon: <BoxIcon /> },
];

const OfficeMobileNavMenu: React.FC<OfficeMobileNavMenuProps> = ({ activePage, setActivePage, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigation = (page: OfficePage) => {
    setActivePage(page);
    setIsOpen(false);
  };

  return (
    <div className="md:hidden">
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-40 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-110"
        aria-label="Open menu"
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
        aria-labelledby="office-menu-title"
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 id="office-menu-title" className="text-lg font-bold text-gray-800">Office Menu</h2>
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
              {navItems.map((item) => (
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

export default OfficeMobileNavMenu;