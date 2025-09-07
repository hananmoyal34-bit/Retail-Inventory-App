import React from 'react';
import { User } from '../types';
import { LoginIcon } from './icons';
import AccountsView from './AccountsView';

interface AccountingPortalProps {
  user: User;
  onLogout: () => void;
}

const AccountingPortal: React.FC<AccountingPortalProps> = ({ user, onLogout }) => {
  return (
    <div className="min-h-screen font-sans text-gray-800">
      <header className="bg-white/70 backdrop-blur-lg shadow-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-indigo-600">Inv<span className="text-gray-700">Sys</span></span>
              <span className="ml-4 text-sm font-medium text-gray-500 border-l pl-4">Accounting Portal</span>
            </div>
            <div className="flex items-center">
              <span className="hidden sm:inline text-sm text-gray-700 mr-4">Welcome, {user.name}</span>
              <button onClick={onLogout} className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                <LoginIcon className="h-5 w-5 mr-1 transform -scale-x-100" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <AccountsView />
      </main>
    </div>
  );
};

export default AccountingPortal;