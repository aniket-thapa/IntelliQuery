import { useState } from 'react';
import { Send } from 'lucide-react';

export default function ChatInput({ onSend }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSend(query);
    setQuery('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 p-3 bg-gray-900 border-t border-gray-800"
    >
      <input
        type="text"
        placeholder="Ask something..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1 p-2 rounded bg-gray-800 text-white outline-none"
      />
      <button
        type="submit"
        className="p-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white"
      >
        <Send className="w-5 h-5" />
      </button>
    </form>
  );
}
