import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import AdminPortal from './components/AdminPortal';
import ManagerPortal from './components/ManagerPortal';
import LogisticsPortal from './components/OfficePortal';
import { User } from './types';

const SESSION_STORAGE_KEY = 'inventory_system_user';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedUserJson = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (savedUserJson) {
        const savedUser: User = JSON.parse(savedUserJson);
        setUser(savedUser);
      }
    } catch (error) {
      console.error("Failed to parse user from session storage", error);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (loggedInUser: User) => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-lg text-gray-600">Loading Application...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage onLogin={handleLogin} />;
  }

  switch (user.role) {
    case 'Admin':
      return <AdminPortal onLogout={handleLogout} />;
    case 'Manager':
      return <ManagerPortal user={user} onLogout={handleLogout} />;
    case 'Logistics':
      return <LogisticsPortal user={user} onLogout={handleLogout} />;
    default:
      // If user has an unknown role, log them out.
      handleLogout();
      return <LandingPage onLogin={handleLogin} />;
  }
};

export default App;