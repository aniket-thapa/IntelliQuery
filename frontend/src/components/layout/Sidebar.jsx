import { FileJson, Home, Link, MessageCircle, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/chat', label: 'Chat', icon: MessageCircle },
    { to: '/settings', label: 'Settings', icon: Settings },
    { to: '/integration', label: 'Integration', icon: Link },
    { to: '/onboarding', label: 'DB Schema', icon: FileJson },
  ];

  return (
    <aside className="w-56 bg-gray-800 h-screen p-4 space-y-4">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex items-center gap-2 p-2 rounded hover:bg-gray-700 ${
              isActive ? 'bg-gray-700 text-white' : 'text-gray-300'
            }`
          }
        >
          <item.icon className="w-5 h-5" /> {item.label}
        </NavLink>
      ))}
    </aside>
  );
}
