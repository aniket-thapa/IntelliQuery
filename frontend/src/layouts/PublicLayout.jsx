// src/layouts/PublicLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicHeader from './PublicHeader';

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen w-full flex flex-col bg-background text-foreground">
      <PublicHeader />

      <main className="flex-grow container mx-auto px-4 md:px-6 py-8 md:py-12">
        {children || <Outlet />}
      </main>

      {/* Footer Copyright */}
      <footer>
        <div className="border-t border-white/10 py-6 relative z-10">
          <div className="container mx-auto flex flex-col items-center justify-between px-4 text-xs text-gray-500 sm:flex-row md:px-6">
            <p>
              &copy; {new Date().getFullYear()} IntelliQuery. All Rights
              Reserved.
            </p>
            <p className="mt-2 sm:mt-0 flex items-center gap-1.5">
              A project by
              <a
                href="https://github.com/aniket-thapa"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gray-400 hover:text-white transition-colors"
              >
                Aniket Thapa
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
