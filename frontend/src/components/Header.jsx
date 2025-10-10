// src/components/Header.jsx
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  Menu,
  LayoutDashboard,
  Settings,
  LogOut,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetContent,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const Logo = () => (
    <Link to="/" className="group flex items-center gap-2 select-none">
      <div className="relative flex items-center justify-center">
        <div className="relative mx-1 flex items-center justify-center">
          <BrainCircuit className="relative h-8 w-8 text-cyan-500" />
        </div>
      </div>

      <div className="flex flex-col leading-tight">
        <span className="text-lg sm:text-xl font-bold tracking-tight">
          IntelliQuery
        </span>
        <span className="text-[11px] text-gray-400 group-hover:text-gray-100 transition-colors">
          AI Data Analyst
        </span>
      </div>
    </Link>
  );

  const navLinks = [
    // Example if needed later:
    // { name: 'Docs', href: '/docs' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Logo />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {user &&
            navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {link.name}
              </Link>
            ))}
        </nav>

        {/* Desktop User Menu */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                >
                  <Avatar>
                    <AvatarFallback>
                      {user.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate('/account')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Account</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/dashboard')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/settings')}>
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
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link to="/signup">
                <Button>Sign Up</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu using SheetTrigger */}
        <div className="md:hidden">
          <Sheet>
            {/* SheetTrigger button */}
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-full max-w-xs p-6">
              <SheetHeader className="flex justify-between items-center mb-8">
                <SheetTitle>
                  <Logo />
                </SheetTitle>
                <SheetDescription>Your AI Data Analyst</SheetDescription>
              </SheetHeader>

              <div className="flex flex-col h-full">
                {user && (
                  <div className="mb-6 flex flex-col space-y-1 px-1">
                    <p className="text-sm font-medium leading-none">
                      {user.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                )}

                {/* Navigation links */}

                <nav className="flex flex-col gap-4 text-lg font-medium">
                  {user ? (
                    <>
                      <Link
                        to="/dashboard"
                        className="text-muted-foreground hover:text-primary"
                      >
                        Dashboard
                      </Link>
                      {navLinks.map((link) => (
                        <Link
                          key={link.name}
                          to={link.href}
                          className="text-muted-foreground hover:text-primary"
                        >
                          {link.name}
                        </Link>
                      ))}
                      <Link
                        to="/settings"
                        className="text-muted-foreground hover:text-primary"
                      >
                        Settings
                      </Link>
                    </>
                  ) : (
                    <></>
                  )}
                </nav>

                <div className="mt-auto flex flex-col gap-4">
                  {user ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleLogout();
                      }}
                    >
                      Log Out
                    </Button>
                  ) : (
                    <>
                      <Link to="/login">
                        <Button variant="outline" className="w-full">
                          Login
                        </Button>
                      </Link>
                      <Link to="/signup">
                        <Button className="w-full">Sign Up</Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
