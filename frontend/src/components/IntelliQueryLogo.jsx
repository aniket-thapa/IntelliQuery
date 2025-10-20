import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const IntelliQueryLogo = ({ className, to = '/' }) => {
  return (
    <Link
      to={to}
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

export default IntelliQueryLogo;
