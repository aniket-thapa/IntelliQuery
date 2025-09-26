import { useAuth } from '../../context/AuthContext';
import { Moon, Sun, LogOut } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext'; // we’ll add a ThemeContext
import { Link } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-gray-900 shadow-md">
      {/* Left side: Brand */}
      <Link to="/dashboard" className="text-xl font-bold text-white">
        IntelliQuery
      </Link>

      {/* Right side: User & Actions */}
      <div className="flex items-center gap-4">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-gray-700 hover:bg-gray-600"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-yellow-400" />
          ) : (
            <Moon className="w-5 h-5 text-gray-300" />
          )}
        </button>

        {/* User */}
        {user && <span className="text-sm text-gray-300">{user.name}</span>}

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-1 text-red-400 hover:text-red-300"
        >
          <LogOut className="w-5 h-5" /> <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}
