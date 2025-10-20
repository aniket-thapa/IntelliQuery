import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="w-full max-w-sm mx-auto flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-9xl font-black text-gray-200">404</h1>
        <p className="text-2xl font-bold tracking-tight text-gray-200 sm:text-4xl">
          Uh-oh!
        </p>
        <p className="mt-4 text-gray-400">We can't find that page.</p>
        <Button asChild className="mt-6">
          <Link to="/">Go Back Home</Link>
        </Button>
      </div>
    </div>
  );
}
