import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function CodeBlock({ code }) {
  const [hasCopied, setHasCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(code, null, 2));
    setHasCopied(true);
    toast.success('Query copied to clipboard!');
    setTimeout(() => {
      setHasCopied(false);
    }, 2000);
  };

  if (!code) return null;

  return (
    <div className="relative mt-4">
      <pre className="p-4 bg-black/50 rounded-md text-xs text-white overflow-x-auto border">
        <code>{JSON.stringify(code, null, 2)}</code>
      </pre>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 h-7 w-7"
        onClick={copyToClipboard}
      >
        {hasCopied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
