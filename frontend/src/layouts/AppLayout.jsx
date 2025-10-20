import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import IntelliQueryLogo from '../components/IntelliQueryLogo';
import { Button, buttonVariants } from '@/components/ui/button';
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
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '../context/AuthContext';

const SidebarNav = ({ isMobile = false }) => {
  const location = useLocation();
  const { user } = useAuth();
  const CloseTrigger = isMobile ? SheetClose : 'div';

  const navLinks = [
    {
      to: '/app/dashboard',
      icon: <MessageSquare className="h-5 w-5" />,
      label: 'Dashboard',
    },
  ];

  const adminLinks = [
    {
      to: '/app/settings/team',
      icon: <Users className="h-5 w-5" />,
      label: 'Team Settings',
    },
    {
      to: '/app/settings/database',
      icon: <Database className="h-5 w-5" />,
      label: 'Database',
    },
    {
      to: '/app/settings/schema',
      icon: <FileJson className="h-5 w-5" />,
      label: 'Schema',
    },
  ];

  const renderLink = (link) => {
    const isActive = location.pathname.startsWith(link.to);
    const className = buttonVariants({
      variant: isActive ? 'secondary' : 'ghost',
      size: isMobile ? 'lg' : 'default',
      className: 'w-full justify-start gap-3',
    });

    const content = (
      <>
        {link.icon}
        {isMobile ? (
          <span className="text-base">{link.label}</span>
        ) : (
          <span className="text-sm">{link.label}</span>
        )}
      </>
    );

    if (isMobile) {
      return (
        <CloseTrigger asChild key={link.to}>
          <Link to={link.to} className={className}>
            {content}
          </Link>
        </CloseTrigger>
      );
    }

    // --- Desktop: Wrap with Tooltip ---
    return (
      <Tooltip delayDuration={0} key={link.to}>
        <TooltipTrigger asChild>
          <Link to={link.to} className={className}>
            {content}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{link.label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <nav
      className={`flex flex-col gap-2 ${isMobile ? 'p-4 font-medium' : 'px-4'}`}
    >
      {navLinks.map(renderLink)}

      {/* --- Admin Links --- */}
      {(user?.role === 'admin' || user?.role === 'developer') && (
        <>
          <Separator className="my-2" />
          <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Admin
          </p>
          {adminLinks.map(renderLink)}
        </>
      )}
    </nav>
  );
};

// --- Re-usable User Dropdown ---
const UserDropdown = ({ onLogout }) => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full shrink-0"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {user.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="sr-only">Toggle user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={onLogout}
          className="text-destructive cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// --- Main AppLayout Component ---
export default function AppLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    // TooltipProvider is needed for the sidebar tooltips
    <TooltipProvider>
      <div className="grid min-h-screen w-full overflow-hidden md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        {/* --- Desktop Sidebar --- */}
        {/* Use bg-muted for a stronger, more modern separation */}
        <div className="hidden border-r bg-muted md:block">
          <div className="flex h-full max-h-screen flex-col">
            {/* Logo/Header */}
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
              <IntelliQueryLogo className="gap-2" to="/app/dashboard" />
            </div>
            {/* Nav */}
            <div className="flex-1 overflow-auto py-4">
              <SidebarNav />
            </div>
          </div>
        </div>

        {/* --- Main Content Area --- */}
        {/* This container ensures the header and main content are stacked vertically
            and don't exceed the viewport height. */}
        <div className="flex flex-col max-h-screen overflow-hidden">
          {/* --- Header --- */}
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
            {/* Mobile Nav Trigger */}
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
              <SheetContent side="left" className="flex flex-col p-0">
                {/* Mobile Logo */}
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                  <Link
                    to="/app/dashboard"
                    className="flex items-center gap-2 font-semibold"
                  >
                    <BrainCircuit className="h-6 w-6 text-primary" />
                    <span className="text-lg">IntelliQuery</span>
                  </Link>
                </div>
                {/* Mobile Nav */}
                <div className="flex-1 overflow-auto py-4">
                  <SidebarNav isMobile />
                </div>
                {/* Mobile User Menu (bottom) */}
                <div className="mt-auto border-t p-4">
                  <UserDropdown onLogout={handleLogout} />
                </div>
              </SheetContent>
            </Sheet>

            {/* Spacer */}
            <div className="w-full flex-1" />

            {/* Desktop User Menu */}
            <UserDropdown onLogout={handleLogout} />
          </header>

          {/* --- Main Content --- */}
          {/* This <main> tag is now the primary scrolling area for all pages. */}
          <main className="flex flex-1 flex-col bg-background overflow-auto">
            {/* The Outlet will render the DashboardPage, SettingsLayout, etc. */}
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
