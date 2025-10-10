import { Link } from 'react-router-dom';
import { BrainCircuit } from 'lucide-react';

const Logo = () => (
  <Link to="/" className="group flex items-center gap-2 select-none mb-8">
    <BrainCircuit className="h-7 w-7 text-primary" />
    <span className="text-xl font-bold tracking-tight">IntelliQuery</span>
  </Link>
);

export default function PublicPageLayout({ children, title, description }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-50">
        <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] bg-purple-500/30 rounded-full filter blur-3xl animate-blob"></div>
        <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] bg-blue-500/30 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
      </div>
      <div className="w-full max-w-sm text-center">
        <Logo />
        {children}
      </div>
    </div>
  );
}
