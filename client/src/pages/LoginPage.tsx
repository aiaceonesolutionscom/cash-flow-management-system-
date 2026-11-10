import React, { useState } from 'react';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState<string>('admin@cashflow.local');
  const [password, setPassword] = useState<string>('AdminPassword123!');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.message || 'Invalid credentials');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      {/* Logos & Header Section */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* 3 Logos in Row: Left = Tech Academy | Center = Krunch | Right = Global Sourcing */}
        <div className="flex items-center justify-center gap-3 sm:gap-5 mb-5">
          {/* Left: Global Tech Academy */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl shadow-xs border border-slate-200 p-2 flex items-center justify-center overflow-hidden hover:shadow-md transition-shadow">
            <img
              src="/logos/global-tech-academy.png"
              alt="Global Tech Academy"
              className="max-h-full max-w-full object-contain"
            />
          </div>

          {/* Center: Krunch 360 */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl shadow-xs border border-slate-200 p-2 flex items-center justify-center overflow-hidden hover:shadow-md transition-shadow ring-2 ring-blue-500/10">
            <img
              src="/logos/krunch.jpeg"
              alt="Krunch 360"
              className="max-h-full max-w-full object-contain rounded-xl"
            />
          </div>

          {/* Right: Global Sourcing International */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl shadow-xs border border-slate-200 p-2 flex items-center justify-center overflow-hidden hover:shadow-md transition-shadow">
            <img
              src="/logos/global-sourcing.png"
              alt="Global Sourcing International"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Expense & Cash Flow Management
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
          Centralized Financial Management System
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-sm border border-slate-200 rounded-2xl">
          <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Admin Email Address
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@cashflow.local"
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In to Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
