import { Outlet, NavLink } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';

export default function SettingsLayout() {
  const getLinkClassName = ({ isActive }) =>
    `px-3 py-1.5 text-sm rounded-md transition-colors ${
      isActive
        ? 'font-semibold text-primary bg-muted'
        : 'text-muted-foreground hover:bg-muted/50'
    }`;

  return (
    <div className="space-y-6 min-w-full max-w-7xl mx-auto p-4 md:p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your organization, database, and schema.
        </p>
      </div>
      <Separator />
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="lg:w-1/5">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
            <NavLink to="team" className={getLinkClassName}>
              Team
            </NavLink>
            <NavLink to="database" className={getLinkClassName}>
              Database
            </NavLink>
            <NavLink to="schema" className={getLinkClassName}>
              Schema
            </NavLink>
          </nav>
        </aside>
        <div className="flex-1 lg:max-w-4xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
