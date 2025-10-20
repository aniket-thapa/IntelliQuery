// src/components/layout/PublicHeader.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { Menu, X, BrainCircuit, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const IntelliQueryLogo = ({ className }) => {
  return (
    <Link
      to="/"
      className={cn('group flex items-center gap-2 select-none', className)}
    >
      <div className="relative flex items-center justify-center">
        <img
          src="/intelliquery-logo.svg"
          alt="IntelliQuery Logo"
          className="h-7 w-7 text-primary"
        />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
          IntelliQuery
        </span>
        <span className="text-[11px] text-muted-foreground group-hover:text-foreground/80 transition-colors">
          AI Data Analyst
        </span>
      </div>
    </Link>
  );
};

// Main Header Component
export default function PublicHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const navLinks = [
    { name: 'Features', href: '/#features' },
    { name: 'How It Works', href: '/#how-it-works' },
    { name: 'AI Core', href: '/#ai-core' },
    { name: 'Tech Stack', href: '/tech' },
    { name: 'Quickstart', href: '/#quickstart' },
  ];

  const commonLinkClasses =
    'text-sm font-medium text-muted-foreground hover:text-primary transition-colors';
  const mobileLinkClasses =
    'text-lg font-medium text-foreground hover:text-primary transition-colors';

  return (
    <header className="top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <IntelliQueryLogo />

        {isHomePage && (
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a key={link.name} href={link.href} className={commonLinkClasses}>
                {link.name}
              </a>
            ))}
          </nav>
        )}

        {/* Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link to="/signup">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-xs">
              <div className="flex justify-between items-center mb-6 px-2 pt-2">
                <IntelliQueryLogo onClick={() => setIsMenuOpen(false)} />
              </div>
              {isHomePage && (
                <nav className="flex flex-col items-start space-y-4 px-2">
                  {navLinks.map((link) => (
                    <SheetClose asChild key={link.name}>
                      <a href={link.href} className={mobileLinkClasses}>
                        {link.name}
                      </a>
                    </SheetClose>
                  ))}
                </nav>
              )}
              <div className="mt-auto flex flex-col gap-3 p-4 border-t border-border/40">
                <SheetClose asChild>
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/login">Login</Link>
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button asChild className="w-full">
                    <Link to="/signup">Get Started</Link>
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
