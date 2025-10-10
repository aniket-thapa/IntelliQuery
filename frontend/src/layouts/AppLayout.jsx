import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import {
  BrainCircuit,
  Menu,
  MessageSquare,
  Users,
  Database,
  FileJson,
  LogOut,
  Settings,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '../context/AuthContext';

const SidebarNav = ({ isMobile = false }) => {
  const location = useLocation();
  const { user } = useAuth();
  const CloseTrigger = isMobile ? SheetClose : 'div';

  const navLinks = [
    {
      to: '/app/dashboard',
      icon: <MessageSquare className="h-4 w-4" />,
      label: 'Dashboard',
    },
    {
      to: '/app/settings',
      icon: <Settings className="h-4 w-4" />,
      label: 'Settings',
      adminOnly: true,
    },
  ];

  return (
    <nav
      className={`flex flex-col gap-2 ${
        isMobile ? 'p-4 text-lg font-medium' : 'px-4'
      }`}
    >
      {navLinks.map((link) => {
        if (
          link.adminOnly &&
          user?.role !== 'admin' &&
          user?.role !== 'developer'
        ) {
          return null;
        }
        return (
          <CloseTrigger asChild key={link.to}>
            <Link to={link.to}>
              <Button
                variant={
                  location.pathname.startsWith(link.to) ? 'secondary' : 'ghost'
                }
                className="w-full justify-start"
              >
                {link.icon}
                <span className="ml-3">{link.label}</span>
              </Button>
            </Link>
          </CloseTrigger>
        );
      })}
    </nav>
  );
};

const UserDropdown = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" className="rounded-full">
          <Avatar>
            <AvatarFallback>
              {user.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="sr-only">Toggle user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/app/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default function AppLayout() {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      {/* --- Desktop Sidebar --- */}
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link
              to="/app/dashboard"
              className="flex items-center gap-2 font-semibold"
            >
              <BrainCircuit className="h-6 w-6 text-primary" />
              <span className="">IntelliQuery</span>
            </Link>
          </div>
          <div className="flex-1 py-4">
            <SidebarNav />
          </div>
        </div>
      </div>

      {/* --- Main Content Area --- */}
      <div className="flex flex-col">
        {/* --- Header --- */}
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <Link
                  to="/app/dashboard"
                  className="flex items-center gap-2 font-semibold"
                >
                  <BrainCircuit className="h-6 w-6 text-primary" />
                  <span className="">IntelliQuery</span>
                </Link>
              </div>
              <SidebarNav isMobile />
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1" />
          <UserDropdown />
        </header>

        <main className="flex flex-1 flex-col bg-background overflow-auto">
          <Outlet />{' '}
          {/* This is where the nested page components will render */}
        </main>
      </div>
    </div>
  );
}
