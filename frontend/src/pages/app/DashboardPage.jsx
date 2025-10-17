// COMPLETE UPDATE & FIXES NEEDED

import {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
} from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Paperclip,
  SendHorizonal,
  LoaderCircle,
  Heading2,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import api from '../../lib/api';
import ChatMessage from '../../components/chat/ChatMessage';
import { useAuth } from '../../context/AuthContext'; // TEMP

const MESSAGES_PER_PAGE = 15;

export default function DashboardPage() {
  const { logout } = useAuth();
  return (
    <>
      <div className="text-center text-gray-200 mt-16">
        <h1 className="text-9xl font-black text-gray-100">500</h1>
        <p className="text-2xl font-bold tracking-tight sm:text-4xl">
          Hold up 😅
        </p>
        <p className="mt-4 text-gray-400">
          Still under construction — big things coming 🚀
        </p>
        <Button
          onClick={() => {
            logout();
          }}
          className="mt-6"
        >
          Back to Login <LogOut />
        </Button>
      </div>
    </>
  );

  // ************************************************************************************************ //
  // ************************************************************************************************ //

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);

  const viewportRef = useRef(null);
  const scrollAnchorRef = useRef(null);

  // --- KEY FIX 1: Refs to manage state for the scroll handler ---
  const scrollStateRef = useRef({
    page: 1,
    hasMore: true,
    isFetchingHistory: true,
  });
  // This flag prevents the scroll handler from firing on initial load.
  const initialLoadComplete = useRef(false);

  // Update the ref on every render so the scroll handler has fresh state
  useEffect(() => {
    scrollStateRef.current = { page, hasMore, isFetchingHistory };
  });

  const fetchMessages = useCallback(async (pageNum, isInitialLoad = false) => {
    if (
      (!scrollStateRef.current.hasMore ||
        scrollStateRef.current.isFetchingHistory) &&
      !isInitialLoad
    )
      return;

    setIsFetchingHistory(true);

    try {
      const res = await api.get(
        `/chat/messages?page=${pageNum}&limit=${MESSAGES_PER_PAGE}`
      );
      const newMessages = res.data.messages || [];

      if (newMessages.length < MESSAGES_PER_PAGE) {
        setHasMore(false);
      }

      if (!isInitialLoad && viewportRef.current) {
        scrollAnchorRef.current = {
          scrollTop: viewportRef.current.scrollTop,
          scrollHeight: viewportRef.current.scrollHeight,
        };
      }

      // The API sends [10, 9, 8]. We reverse to get [8, 9, 10] then prepend.
      setMessages((prev) => [...newMessages, ...prev]);
      setPage(pageNum + 1);
    } catch (error) {
      toast.error('Failed to fetch message history.');
    } finally {
      setIsFetchingHistory(false);
    }
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (viewport && scrollAnchorRef.current) {
      const { scrollTop, scrollHeight } = scrollAnchorRef.current;
      viewport.scrollTop = scrollTop + (viewport.scrollHeight - scrollHeight);
      scrollAnchorRef.current = null;
    }
  }, [messages]);

  useEffect(() => {
    // Find the viewport element once and attach listener
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      // Only run if initial load is done and we are near the top.
      if (initialLoadComplete.current && viewport.scrollTop < 10) {
        const { page, hasMore, isFetchingHistory } = scrollStateRef.current;
        if (hasMore && !isFetchingHistory) {
          fetchMessages(page);
        }
      }
    };

    viewport.addEventListener('scroll', handleScroll);
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [fetchMessages]);

  // Initial fetch effect
  useEffect(() => {
    fetchMessages(1, true).then(() => {
      setTimeout(() => {
        const viewport = viewportRef.current;
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
          // --- KEY FIX 2: Activate the scroll handler only after the first load is complete ---
          initialLoadComplete.current = true;
        }
      }, 100);
    });
  }, [fetchMessages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const tempId = crypto.randomUUID();
    const userMessage = { _id: tempId, sender: 'user', text: input };

    // --- KEY FIX 3: Simplified optimistic update ---
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    setTimeout(() => {
      if (viewportRef.current)
        viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }, 0);

    try {
      const res = await api.post('/chat', { query: input });
      const agentMessage = {
        _id: res.data?.newMessage?._id || crypto.randomUUID(),
        sender: 'agent',
        data: res.data,
        text: res.data.finalAnswer,
      };

      // Replace the temporary message with the final one from the server.
      setMessages((prev) => {
        const newMessages = prev.filter((m) => m._id !== tempId);
        newMessages.push(userMessage, agentMessage);
        return newMessages;
      });
    } catch (error) {
      toast.error('An error occurred.');
      setMessages((prev) => {
        const newMessages = prev.map((m) =>
          m._id === tempId ? { ...m, error: true } : m
        );
        newMessages.push({
          _id: crypto.randomUUID(),
          sender: 'agent',
          text: 'Sorry, I encountered an error.',
        });
        return newMessages;
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        if (viewportRef.current)
          viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
      }, 0);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    const originalMessages = messages;
    setMessages((prev) => prev.filter((msg) => msg._id !== messageId));

    try {
      await api.delete(`/chat/messages/${messageId}`);

      toast.success('Message deleted');
      return 'ok';
    } catch (error) {
      setMessages(originalMessages);
      toast.error('Failed to delete message.');
      return 'ok';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.24))]">
      <ScrollArea className="flex-1" viewportRef={viewportRef}>
        <div className="p-4 space-y-4">
          {isFetchingHistory && messages.length === 0 ? (
            <div className="flex justify-center p-10">
              <LoaderCircle className="animate-spin h-8 w-8 text-primary" />
            </div>
          ) : (
            <>
              {hasMore && (
                <div className="flex justify-center h-10 items-center">
                  {isFetchingHistory && (
                    <LoaderCircle className="animate-spin" />
                  )}
                </div>
              )}
              {!hasMore && (
                <p className="text-center text-xs text-muted-foreground my-4">
                  Beginning of conversation
                </p>
              )}
              {messages.map((msg) => (
                <ChatMessage
                  key={msg._id}
                  message={msg}
                  onDelete={handleDeleteMessage}
                />
              ))}
            </>
          )}
          {isLoading && (
            <div className="flex items-start gap-4">
              <Avatar className="h-8 w-8 self-start">
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <div className="bg-muted p-3 rounded-lg">
                <LoaderCircle className="animate-spin h-5 w-5" />
              </div>
            </div>
          )}
        </div>
        <ScrollBar />
      </ScrollArea>
      <div className="border-t p-4 bg-background">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about your data..."
            className="pr-20"
            disabled={isLoading}
          />
          <div className="absolute top-1/2 right-3 -translate-y-1/2 flex gap-2">
            <Button variant="ghost" size="icon" disabled>
              <Paperclip className="h-5 w-5" />
            </Button>
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
