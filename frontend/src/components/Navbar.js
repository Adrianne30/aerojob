import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ClipboardList, Home, Briefcase, User, LogOut, Menu, X, Building2, BarChart3, Users as UserIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const displayName =
    user?.name ||
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.email ||
    'User';

  const displayRole = (user?.userType || user?.role || '').toString();

  const navigationItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Jobs', path: '/jobs', icon: Briefcase },
  ];

  const adminNavigationItems = [
    { name: 'Dashboard', path: '/dashboard', icon: BarChart3 },
    { name: 'Companies', path: '/admin/companies', icon: Building2 },
    { name: 'Jobs', path: '/admin/jobs', icon: Briefcase },
    { name: 'Users', path: '/admin/users', icon: UserIcon },
    { name: 'Survey', path: '/admin/surveys', icon: ClipboardList },
  ];

  const userNavigationItems = [
    { name: 'Dashboard', path: '/dashboard', icon: BarChart3 },
    { name: 'Jobs', path: '/jobs', icon: Briefcase },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  const renderNavigationItems = () => {
    if (!isAuthenticated) return navigationItems;
    if (isAdmin()) return adminNavigationItems;
    return userNavigationItems;
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Logo size={40} />
          </div>

          <div className="hidden md:flex items-center space-x-8">
            {renderNavigationItems().map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive(item.path)
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{displayName}</p>
                    <p className="text-gray-500 capitalize">{displayRole}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-3 py-2 text-gray-700 hover:text-error-600 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
            {renderNavigationItems().map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                    isActive(item.path)
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {isAuthenticated && (
              <div className="px-3 py-2 border-t border-gray-200 mt-2 pt-2">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{displayName}</p>
                    <p className="text-gray-500 capitalize">{displayRole}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-gray-700 hover:text-error-600 hover:bg-gray-50 rounded-md text-base font-medium transition-colors duration-200"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            )}

            {!isAuthenticated && (
              <div className="px-3 py-2 border-t border-gray-200 mt-2 pt-2 space-y-2">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="block w-full text-center btn btn-ghost">
                  Login
                </Link>
                <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="block w-full text-center btn btn-primary">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
