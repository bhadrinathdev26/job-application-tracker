import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Briefcase,
  LayoutDashboard,
  ListFilter,
  BarChart3,
  LogOut,
  Menu,
  X,
  User as UserIcon,
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/', label: 'Board', icon: LayoutDashboard },
    { to: '/applications', label: 'Applications', icon: ListFilter },
    { to: '/stats', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left: Brand Logo & Links */}
          <div className="flex items-center gap-8">
            <NavLink to="/" className="flex items-center gap-2 text-indigo-600 font-bold text-xl tracking-tight">
              <div className="w-9 h-9 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-xs">
                <Briefcase className="w-5 h-5" />
              </div>
              <span className="text-slate-900">Career<span className="text-indigo-600">Track</span></span>
            </NavLink>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Right: User profile and Logout */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
              <div className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                {user?.username ? user.username.slice(0, 2) : 'U'}
              </div>
              <span className="font-medium text-slate-800">{user?.username}</span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-rose-600 px-3 py-1.5 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Signed in as <span className="text-slate-700">{user?.username}</span>
          </div>

          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-medium ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </NavLink>
            );
          })}

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
              Log out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
