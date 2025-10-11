import { useState, useEffect, useRef } from 'react';
import {
  SendHorizonal,
  Bot,
  User as UserIcon,
  LoaderCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { toast } from 'sonner';
// We will create this component next
import AIMessage from '../../components/chat/AIMessage';

export default function DashboardPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef(null);
  const lastMessageRef = useRef(null);

  // Fetch initial chat history
  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/chat/messages?limit=50');
        setMessages(res.data.messages || []);
      } catch (error) {
        toast.error('Failed to load chat history.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post('/chat', { query: currentInput });
      const aiResponse = { sender: 'agent', ...res.data };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = {
        sender: 'agent',
        error: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages((prev) => [...prev, errorMsg]);
      toast.error('An error occurred while getting a response.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (lastMessageRef.current) {
      // Scroll into view smoothly
      lastMessageRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div');
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  const Message = ({ msg }) => {
    const isUser = msg.sender === 'user';
    const isError = !!msg.error;

    return (
      <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : ''}`}>
        {!isUser && (
          <Avatar>
            <AvatarFallback>
              <Bot className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        )}
        <div
          className={`rounded-lg p-4 max-w-2xl ${
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}
        >
          {isError ? (
            <p className="text-destructive">{msg.error}</p>
          ) : isUser ? (
            <p className="whitespace-pre-wrap">{msg.text}</p>
          ) : (
            <AIMessage data={msg} />
          )}
        </div>
        {isUser && (
          <Avatar>
            <AvatarFallback>
              {user?.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-theme(spacing.16))]">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-6 max-w-5xl mx-auto w-full">
          {messages.length === 0 && !isLoading ? (
            <div className="text-center p-10">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold">
                Welcome to IntelliQuery
              </h2>
              <p className="text-muted-foreground">
                Ask a question about your data to get started, e.g., "Show me
                total users who signed up last month".
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                ref={index === messages.length - 1 ? lastMessageRef : null}
              >
                <Message key={index} msg={msg} />
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex items-start gap-4">
              <Avatar>
                <AvatarFallback>
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted p-3 rounded-lg">
                <LoaderCircle className="animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="border-t p-4 bg-background">
        <div className="relative max-w-3xl mx-auto">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask a question about your data..."
            className="pr-16 min-h-[48px]"
            rows={1}
          />
          <div className="absolute top-1/2 right-3 -translate-y-1/2 flex gap-2">
            <Button
              onClick={handleSend}
              size="icon"
              disabled={isLoading || !input.trim()}
            >
              <SendHorizonal className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
