import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import AdminPortal from './components/AdminPortal';
import ManagerPortal from './components/ManagerPortal';
import LogisticsPortal from './components/OfficePortal';
import { User } from './types';
import { verifySession } from './services/writeService';

const SESSION_TOKEN_KEY = 'inventory_system_token';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
      if (token) {
        try {
          const result = await verifySession(token);
          if (result.success && result.user) {
            setUser(result.user);
          } else {
            console.error("Session verification failed:", result.message);
            sessionStorage.removeItem(SESSION_TOKEN_KEY);
          }
        } catch (error) {
          console.error("Error during session verification:", error);
          sessionStorage.removeItem(SESSION_TOKEN_KEY);
        }
      }
      setIsLoading(false);
    };
    validateToken();
  }, []);

  const handleLogin = async (token: string) => {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    setIsLoading(true);
    try {
      const result = await verifySession(token);
      if (result.success && result.user) {
        setUser(result.user);
      } else {
        console.error("Login verification failed immediately after login:", result.message);
        // Clear the bad token just in case
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
      }
    } catch (error) {
      console.error("Error during post-login session verification:", error);
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
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
    // FIX: The onLogin prop for LandingPage was expecting a User object, but the handleLogin function provides a token string. The prop type in LandingPage has been corrected.
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
      // FIX: The onLogin prop for LandingPage was expecting a User object, but the handleLogin function provides a token string. The prop type in LandingPage has been corrected.
      return <LandingPage onLogin={handleLogin} />;
  }
};

export default App;