import React, { useState } from 'react';
import { User } from '../types';
import { login } from '../services/writeService';

interface LoginProps {
  role: 'Admin' | 'Manager' | 'Logistics' | 'Accounting';
  onLogin: (token: string) => void;
  onBack: () => void;
}

const Login: React.FC<LoginProps> = ({ role, onLogin, onBack }) => {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      setError('Access code cannot be empty.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const result = await login(accessCode, role);
      if (result.success && result.token) {
        onLogin(result.token);
      } else {
        setError(result.message || `Invalid access code for the ${role} role. Please try again.`);
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError("An error occurred during login. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg relative">
        <button onClick={onBack} className="absolute top-4 left-4 text-sm text-indigo-600 hover:underline">
          &larr; Back to Portals
        </button>
        <h2 className="text-2xl font-bold text-center text-gray-800 mt-8 mb-6">{role} Login</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700">
              Access Code
            </label>
            <input
              type="password"
              id="accessCode"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;