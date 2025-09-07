import React, { useState } from 'react';
import Login from './Login';
import { User } from '../types';
import { CogIcon, LocationMarkerIcon, ClipboardListIcon, DocumentTextIcon } from './icons';

interface LandingPageProps {
  onLogin: (user: User) => void;
}

const PortalCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
    iconBgColor: string;
    iconTextColor: string;
}> = ({ title, description, icon, onClick, iconBgColor, iconTextColor }) => (
    <button
        onClick={onClick}
        className="bg-white rounded-2xl shadow-lg border border-white/20 p-8 text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300 w-full"
    >
        <div className={`mx-auto ${iconBgColor} ${iconTextColor} h-16 w-16 rounded-full flex items-center justify-center`}>
            {icon}
        </div>
        <h3 className="mt-6 text-2xl font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-gray-600">{description}</p>
    </button>
);


const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [loginRole, setLoginRole] = useState<'Admin' | 'Manager' | 'Office' | 'Accounting' | null>(null);

  if (loginRole) {
    return (
      <Login
        role={loginRole}
        onLogin={onLogin}
        onBack={() => setLoginRole(null)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-extrabold text-indigo-600">
          Inv<span className="text-gray-800">Sys</span>
        </h1>
        <p className="mt-4 text-xl text-gray-600">Your Modern Retail Inventory System</p>
      </header>
      <main className="w-full max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <PortalCard
                title="Admin Portal"
                description="Full access to all system features, settings, and user management."
                icon={<CogIcon className="h-8 w-8" />}
                onClick={() => setLoginRole('Admin')}
                iconBgColor="bg-green-100"
                iconTextColor="text-green-600"
            />
            <PortalCard
                title="Manager Portal"
                description="Create and manage product orders for assigned store locations."
                icon={<LocationMarkerIcon className="h-8 w-8" />}
                onClick={() => setLoginRole('Manager')}
                iconBgColor="bg-blue-100"
                iconTextColor="text-blue-600"
            />
             <PortalCard
                title="Office Portal"
                description="View operational data including orders, inventory, and counts."
                icon={<ClipboardListIcon className="h-8 w-8" />}
                onClick={() => setLoginRole('Office')}
                iconBgColor="bg-orange-100"
                iconTextColor="text-orange-600"
            />
            <PortalCard
                title="Accounting Portal"
                description="Access financial data, account balances, and reporting features."
                icon={<DocumentTextIcon className="h-8 w-8" />}
                onClick={() => setLoginRole('Accounting')}
                iconBgColor="bg-purple-100"
                iconTextColor="text-purple-600"
            />
        </div>
      </main>
    </div>
  );
};

export default LandingPage;