import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  BarChart3,
  Users,
  Building,
  MapPin,
  Settings,
  Activity,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Search,
  Bell,
  User,
  AlertTriangle,
  Wrench,
  FileText,
  Fuel
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Locations', href: '/locations', icon: MapPin },
    { name: 'Taxpayer', href: '/taxpayers', icon: Users },
    { name: 'Stations', href: '/stations', icon: MapPin },
    { name: 'Products', href: '/products', icon: BarChart3 }, // Ensure this matches
    { name: 'Tanks', href: '/tanks', icon: Fuel },
    { name: 'Tank Monitor', href: '/tank-monitor', icon: Fuel },
    { name: 'EWURA Registration', href: '/register-ewura', icon: Building },
    { name: 'Transactions', href: '/transactions', icon: Activity },
    { name: 'Tank Assignments', href: '/tank-assignments', icon: Wrench },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Maintenance', href: '/maintenance', icon: Wrench },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 bg-black">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-semibold">EWURA-NPGIS</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="mt-8 px-4">
          {navigation.map((item) => (
            <div key={item.name} className="mb-1">
              <Link
                to={item.href}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg ${isActive(item.href)
                  ? 'bg-red-100 text-red-700'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            </div>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-black shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-white hover:text-gray-200"
              >
                <Menu size={24} />
              </button>
              <h1 className="text-white text-xl font-semibold">Gas Station Management</h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <button className="text-white hover:text-gray-200">
                <Bell size={20} />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="text-white">
                  <div className="text-sm font-medium">{user?.username}</div>
                  <div className="text-xs text-gray-300">{user?.role}</div>
                </div>
                <button
                  onClick={logout}
                  className="text-white hover:text-gray-200 ml-2"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;