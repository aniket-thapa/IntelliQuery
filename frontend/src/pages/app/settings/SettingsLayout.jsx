import { Outlet, NavLink } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { buttonVariants } from '@/components/ui/button';

export default function SettingsLayout() {
  const getLinkClassName = ({ isActive }) =>
    buttonVariants({
      variant: isActive ? 'secondary' : 'ghost',
      size: 'sm',
      className: 'w-fit lg:w-full justify-start flex-shrink-0',
    });

  return (
    // This page will now scroll within the <main> tag of AppLayout
    <div className="space-y-6 min-w-full max-w-7xl mx-auto p-4 md:p-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your organization, database, and schema.
        </p>
      </div>
      <Separator />
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="lg:w-1/7">
          {/* On mobile, this stacks horizontally. On desktop, vertically. */}
          <nav className="flex space-x-2 overflow-x-auto pb-2 lg:flex-col lg:space-x-0 lg:space-y-1 lg:pb-0">
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
        <div className="flex-1 lg:max-w-4xl min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
