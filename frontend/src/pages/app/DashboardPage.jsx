import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Send,
  Loader2,
  ChevronUp,
  Bot,
  User,
  Trash2,
  MoreHorizontal,
  LoaderCircle,
  Download,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip as TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../../lib/api';
import { toast } from 'sonner';

// --- Chart.js Imports ---
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

// --- Register Chart.js components ---
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const useChat = (token) => {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [partialAnswer, setPartialAnswer] = useState('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const eventSourceRef = useRef(null); // Ref to hold the EventSource instance

  const fetchMessages = useCallback(
    async (page) => {
      if (isLoadingMore || !token) return;

      setIsLoadingMore(true);
      try {
        const response = await api.get(`/chat/messages?limit=20&page=${page}`);

        if (response.data.status && response.data.messages) {
          const fetchedMessages = response.data.messages;
          if (page === 1) {
            setMessages(fetchedMessages); // Reverse initial load for correct order
          } else {
            setMessages((prev) => [...fetchedMessages, ...prev]);
          }
          setHasMore(response.data.hasMore); // Use backend flag
          setCurrentPage(page);
        } else {
          setHasMore(false);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to fetch messages.');
        setHasMore(false);
      } finally {
        setIsLoadingMore(false);
      }
    },
    [token, isLoadingMore]
  );

  useEffect(() => {
    if (token) {
      setMessages([]);
      setHasMore(true);
      setCurrentPage(1);
      fetchMessages(1);
    } else {
      setMessages([]);
      setHasMore(true);
      setCurrentPage(1);
    }
    // Only re-run when token changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadMoreMessages = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      fetchMessages(currentPage + 1);
    }
  }, [hasMore, isLoadingMore, currentPage, fetchMessages]);

  const sendMessage = useCallback(
    async (query) => {
      if (!query.trim() || isStreaming || !token) return;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const userMessage = {
        _id: `temp-${Date.now()}`,
        sender: 'user',
        text: query,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);
      setCurrentStep('starting');
      setPartialAnswer('');

      const eventSourceUrl = `${
        api.defaults.baseURL
      }/chat?query=${encodeURIComponent(query)}&token=${token}`;
      eventSourceRef.current = new EventSource(eventSourceUrl);

      let finalAgentData = null;

      eventSourceRef.current.onmessage = (event) => {
        try {
          const streamData = JSON.parse(event.data);

          if (streamData.error) {
            console.error('SSE Error:', streamData.error);
            toast.error('An error occurred', { description: streamData.error });
            if (eventSourceRef.current) eventSourceRef.current.close();
            setIsStreaming(false);
            return;
          }

          setCurrentStep(streamData.step);

          if (streamData.data) {
            finalAgentData = streamData.data;
            if (typeof streamData.data.finalAnswer === 'string') {
              setPartialAnswer(streamData.data.finalAnswer);
            }
          }
        } catch (e) {
          console.error('Error parsing SSE data:', e, 'Data:', event.data);
          toast.error('Received invalid data from server.');
          if (eventSourceRef.current) eventSourceRef.current.close();
          setIsStreaming(false);
        }
      };

      eventSourceRef.current.onerror = (error) => {
        console.error('EventSource failed:', error);
        if (error.target?.readyState !== EventSource.CLOSED) {
          toast.error('Connection Error', {
            description: 'Lost connection to the server.',
          });
        }
        setIsStreaming(false);
        setCurrentStep('');
        setPartialAnswer('');
        eventSourceRef.current = null;
      };

      eventSourceRef.current.addEventListener('close', () => {
        console.log('SSE stream closed by server.');
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
        setIsStreaming(false);
        setCurrentStep('');
        eventSourceRef.current = null;

        if (
          finalAgentData &&
          (finalAgentData.finalAnswer || finalAgentData.tableData?.rows)
        ) {
          fetchMessages(1);
          setPartialAnswer('');
        } else if (partialAnswer) {
          console.warn('Stream closed, using partialAnswer as final message.');
          fetchMessages(1);
          setPartialAnswer('');
        } else {
          console.warn(
            'Stream closed but no final data or partial answer was available.'
          );
        }
      });
    },
    [isStreaming, token, fetchMessages, partialAnswer] // Added partialAnswer
  );

  // --- NEW: Delete Message Function ---
  const deleteMessage = useCallback(
    async (messageIdToDelete) => {
      // Optimistically remove from state
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg._id !== messageIdToDelete)
      );

      try {
        const response = await api.delete(
          `/chat/messages/${messageIdToDelete}`
        );
        if (response.data.status) {
          toast.success('Message deleted.'); // No need to refetch, already removed optimistically
        } else {
          // Revert optimistic update on failure
          toast.error('Failed to delete message.', {
            description: response.data.error,
          });
          fetchMessages(1); // Refetch to get the correct state
        }
      } catch (error) {
        console.error('Error deleting message:', error);
        toast.error('Failed to delete message.', {
          description: error.response?.data?.error || 'Network error',
        }); // Revert optimistic update on failure
        fetchMessages(1); // Refetch to get the correct state
      }
    },
    [fetchMessages]
  ); // Added fetchMessages dependency

  return {
    messages,
    isStreaming,
    currentStep,
    partialAnswer,
    isLoadingMore,
    hasMore,
    sendMessage,
    loadMoreMessages,
    deleteMessage,
  };
};

// --- Chart Rendering Component (REFACTORED) ---
// This now uses CSS variables from ShadCN/Tailwind for theme-awareness
const ChartRenderer = ({ visualization }) => {
  if (!visualization || !visualization.data || !visualization.type) {
    console.log(
      'ChartRenderer: Invalid or missing visualization data',
      visualization
    );
    return null;
  }

  const { type, title, data } = visualization;

  // --- Theme-Aware Chart.js options ---
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#cbd5e1' } }, // text-slate-300
      title: {
        display: true,
        text: title,
        color: '#f8fafc',
        font: { size: 16 },
      }, // text-slate-50
      tooltip: {
        backgroundColor: 'rgba(30, 41, 59, 0.9)', // bg-slate-800/90
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1', // text-slate-50, text-slate-300
        borderColor: '#475569',
        borderWidth: 1, // border-slate-600
      },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8' }, // text-slate-400
        grid: { color: 'rgba(71, 85, 105, 0.4)' }, // border-slate-700/30
        border: { color: '#475569' }, // border-slate-600
      },
      y: {
        ticks: { color: '#94a3b8' }, // text-slate-400
        grid: { color: 'rgba(71, 85, 105, 0.4)' }, // border-slate-700/30
        border: { color: '#475569' }, // border-slate-600
      },
    },
  };

  const datasetDefaults = {
    borderColor: 'rgba(59, 130, 246, 0.8)',
    backgroundColor: 'rgba(59, 130, 246, 0.5)', // blue-500
    tension: 0.1,
    pointBackgroundColor: 'rgba(59, 130, 246, 1)',
    pointBorderColor: '#fff',
    pointHoverBackgroundColor: '#fff',
    pointHoverBorderColor: 'rgba(59, 130, 246, 1)',
  };

  // Ensure datasets exist before mapping
  const chartData = {
    ...data,
    datasets: data.datasets?.map((ds) => ({ ...datasetDefaults, ...ds })) || [],
  };
  // Add safety check for empty data
  if (
    !chartData.labels ||
    chartData.labels.length === 0 ||
    !chartData.datasets ||
    chartData.datasets.length === 0
  ) {
    console.log('ChartRenderer: Empty labels or datasets', chartData);
    return (
      <div className="my-4 p-4 text-center text-muted-foreground">
        No data available for chart.
      </div>
    );
  }

  return (
    // This container holds the chart and defines its aspect ratio/height
    <div className="my-4 p-4 bg-muted/30 border border-border/50 rounded-lg shadow-md h-72">
      {type === 'bar' && <Bar options={chartOptions} data={chartData} />}
      {type === 'line' && <Line options={chartOptions} data={chartData} />}
      {/* Add other chart types like 'pie' if needed */}
    </div>
  );
};

// --- Helper function to export data as CSV ---
const exportToCsv = (filename, tableConfig, rows) => {
  if (!tableConfig || !rows || rows.length === 0) {
    toast.error('No data available to export.');
    return;
  }

  const escapeCsvCell = (cellValue) => {
    if (cellValue == null) {
      // Handles null and undefined
      return '';
    }
    const stringValue = String(cellValue);
    // If the string contains a comma, double quote, or newline, wrap it in double quotes and escape existing double quotes
    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const headers = tableConfig.columns
    .map((col) => escapeCsvCell(col.header))
    .join(',');
  const csvRows = rows.map((row) =>
    tableConfig.columns.map((col) => escapeCsvCell(row[col.key])).join(',')
  );

  const csvString = [headers, ...csvRows].join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

  // Create a link and trigger the download
  const link = document.createElement('a');
  if (link.download !== undefined) {
    // Feature detection
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up
  } else {
    toast.error('CSV export is not supported in this browser.');
  }
};

// --- ChatMessage Component (Keep as-is, it's correct) ---
const ChatMessageComponent = ({ message, onDelete }) => {
  // ... (Your existing ChatMessageComponent code)
  const isAgent = message.sender === 'agent';

  // --- FIX: Access data correctly ---
  const tableData = message.data?.tableData; // Access the nested tableData object
  const visualization = tableData?.visualization;
  const tableConfig = tableData?.tableConfig;
  const rows = tableData?.rows;
  // --- END FIX ---

  const messageClass = `group relative flex gap-4 px-4 py-5 sm:py-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ${
    isAgent ? 'bg-muted/30 rounded-lg' : ''
  }`;
  const avatarClass = `flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
    isAgent
      ? 'bg-primary text-primary-foreground'
      : 'bg-secondary text-secondary-foreground'
  }`;
  const proseClass =
    'prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50 p-2 rounded';

  // --- Handler for the Export Button ---
  const handleExportClick = () => {
    const filename = `intelliquery_export_${
      new Date().toISOString().split('T')[0]
    }.csv`;
    exportToCsv(filename, tableConfig, rows);
    toast.success('CSV Exported!');
  };

  return (
    <div className={messageClass}>
      <div className={avatarClass}>
        {isAgent ? <Bot className="w-5 h-5" /> : <User className="w-4 h-4" />}
      </div>
      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground">
            {isAgent ? 'AI Assistant' : 'You'}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className={proseClass}>
          {/* Render markdown text */}
          {message.text && (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.text}
            </ReactMarkdown>
          )}

          {/* Render table data if present (using corrected paths) */}
          {isAgent && tableConfig && rows && rows.length > 0 && (
            <div className="md:my-12 my-8 relative group/table">
              {/* Added relative positioning and group */}
              <div className="overflow-x-auto border border-border/50 rounded-md">
                <table className="min-w-full divide-y divide-border/50">
                  <thead className="bg-muted/50">
                    <tr>
                      {tableConfig.columns.map((col) => (
                        <th
                          key={col.key}
                          className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider"
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-muted/20">
                        {tableConfig.columns.map((col) => (
                          <td
                            key={col.key}
                            className="px-4 py-2 whitespace-nowrap text-sm"
                          >
                            {renderCellContent(row[col.key], col)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Export Button - positioned top-right of the table container */}
              <TooltipProvider>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="absolute -top-3 right-0 h-7 w-7 md:opacity-0 md:group-hover/table:opacity-100 transition-opacity duration-200 bg-background hover:bg-muted"
                    onClick={handleExportClick}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" align="center">
                  <p>Export table as CSV</p>
                </TooltipContent>
              </TooltipProvider>
            </div>
          )}

          {/* Render Visualization if present (using corrected path) */}
          {isAgent && visualization && (
            <ChartRenderer visualization={visualization} />
          )}
        </div>
      </div>
      {message._id && !message._id.startsWith('temp-') && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-2 right-2 h-7 w-7 md:opacity-0 md:group-hover:opacity-100 md:transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Message options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                onDelete(message._id);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete Message
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

// --- Helper to render cell content (keep as-is) ---
const renderCellContent = (value, columnConfig) => {
  // ... (Your existing renderCellContent function)
  if (value === null || value === undefined)
    return <span className="text-muted-foreground/60 italic">null</span>;

  try {
    switch (columnConfig?.renderAs) {
      case 'date': {
        const date = new Date(value);
        return isNaN(date.getTime())
          ? String(value)
          : date.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
      }

      case 'currency':
        return typeof value === 'number'
          ? `$${value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : String(value);

      case 'link': {
        // <-- Added brace
        const url = String(value);
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:opacity-80 break-all"
            >
              {url}
            </a>
          );
        }
        return url;
      }

      case 'count':
        return Array.isArray(value) ? `${value.length} items` : '0 items';

      case 'list':
        if (Array.isArray(value) && columnConfig.sourceField) {
          return (
            value
              .map((item) => item?.[columnConfig.sourceField] ?? '')
              .filter(Boolean)
              .join(', ') || (
              <span className="text-muted-foreground/60 italic">empty</span>
            )
          );
        }
        return (
          <span className="text-muted-foreground/60 italic">invalid list</span>
        );

      default: {
        if (typeof value === 'object') {
          const jsonString = JSON.stringify(value);
          // Simple truncation for display, full data will be in CSV
          return jsonString.length > 50
            ? jsonString.substring(0, 47) + '...'
            : jsonString;
        }
        if (typeof value === 'boolean') {
          return value ? 'True' : 'False';
        }
        return String(value);
      }
    }
  } catch (e) {
    console.error('Error rendering cell content:', e);
    return <span className="text-destructive italic">Error</span>;
  }
};

// --- StreamingMessage Component (keep as-is) ---
const StreamingMessageComponent = ({ currentStep, partialAnswer }) => {
  // ... (Your existing StreamingMessageComponent code)
  const messageClass =
    'flex gap-4 px-4 py-5 sm:px-6 sm:py-6 bg-muted/30 animate-in fade-in slide-in-from-bottom-4 duration-500';
  const avatarClass =
    'flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center';
  const stepClass =
    'flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs';
  const proseClass =
    'prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50 p-2 rounded';
  const thinkingClass = 'flex items-center gap-2 text-muted-foreground';
  const dotClass =
    'w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce';

  // Blinking cursor style
  const cursorStyle = {
    display: 'inline-block',
    width: '8px', // Adjust width as needed
    height: '1em', // Match line height
    backgroundColor: 'currentColor', // Use text color
    animation: 'blink 1s step-end infinite',
    marginLeft: '2px', // Space before cursor
    verticalAlign: 'text-bottom',
  };

  const keyframes = `
      @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
      }
  `;

  return (
    <>
      <style>{keyframes}</style> {/* Inject keyframes */}
      <div className={messageClass}>
        <div className={avatarClass}>
          <Bot className="w-5 h-5" />
        </div>
        <div className="flex-1 space-y-3 overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">
              AI Assistant
            </span>
            {currentStep && (
              <div className={stepClass}>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="capitalize">
                  {currentStep
                    .replace(/_/g, ' ')
                    .replace('schemaSearch', 'Analyzing Schema')
                    .replace('queryGen', 'Generating Query')
                    .replace('executor', 'Executing Query')
                    .replace('responseFormatter', 'Formatting Response')}
                </span>
              </div>
            )}
          </div>
          {partialAnswer ? (
            <div className={proseClass}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {partialAnswer}
              </ReactMarkdown>
              <span style={cursorStyle}></span> {/* Add blinking cursor span */}
            </div>
          ) : (
            <div className={thinkingClass}>
              <div className="flex gap-1">
                <span className={dotClass} style={{ animationDelay: '0ms' }} />
                <span
                  className={dotClass}
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className={dotClass}
                  style={{ animationDelay: '300ms' }}
                />
              </div>
              <span className="text-sm">Thinking...</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// --- DashboardPage (Main Component - REFACTORED) ---
export default function DashboardPage() {
  const { token } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const scrollAreaRef = useRef(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

  const {
    messages,
    isStreaming,
    currentStep,
    partialAnswer,
    isLoadingMore,
    hasMore,
    sendMessage,
    loadMoreMessages,
    deleteMessage,
  } = useChat(token);

  // Auto-scroll logic
  useEffect(() => {
    if (isScrolledToBottom && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, partialAnswer, isScrolledToBottom]);

  // Scroll handlers
  const handleScroll = useCallback(
    (e) => {
      const target = e.target;
      if (target.scrollTop <= 50 && hasMore && !isLoadingMore) {
        loadMoreMessages();
      }
      const bottom =
        Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) <
        10;
      setIsScrolledToBottom(bottom);
    },
    [hasMore, isLoadingMore, loadMoreMessages]
  );

  const handleSend = () => {
    if (inputValue.trim() && !isStreaming) {
      sendMessage(inputValue);
      setInputValue('');
      setIsScrolledToBottom(true);
      // Force scroll to bottom immediately on send
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
      }, 0);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    // This div now fills its parent <main> tag from AppLayout
    <div className="flex flex-col h-full bg-background">
      {/* Messages Area */}
      {/* This div takes up all available space and becomes the inner scroller for messages */}
      <div
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
        ref={scrollAreaRef}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          {/* Load More Indicator */}
          {hasMore && (
            <div className="flex justify-center py-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMoreMessages}
                disabled={isLoadingMore}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                {isLoadingMore ? (
                  <>
                    {' '}
                    <LoaderCircle className="w-4 h-4 animate-spin" /> Loading...{' '}
                  </>
                ) : (
                  <>
                    {' '}
                    <ChevronUp className="w-4 h-4" /> Load older messages{' '}
                  </>
                )}
              </Button>
            </div>
          )}
          {/* Messages */}
          {messages.length === 0 && !isStreaming && !isLoadingMore ? (
            <div className="flex flex-col items-center justify-center pt-20 pb-10 text-center">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-foreground">
                Ask IntelliQuery Anything
              </h2>
              <p className="text-muted-foreground text-sm max-w-sm">
                I can understand your data schema and answer questions in
                natural language, generating insights and visualizations.
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {messages.map((message, index) => (
                <ChatMessageComponent
                  key={message._id || `msg-${index}`}
                  message={message}
                  onDelete={deleteMessage}
                />
              ))}
              {isStreaming && (
                <StreamingMessageComponent
                  currentStep={currentStep}
                  partialAnswer={partialAnswer}
                />
              )}
            </div>
          )}
          <div ref={messagesEndRef} className="h-1" /> {/* Scroll anchor */}
        </div>
      </div>

      {/* Input Area */}
      {/* This is no longer sticky. It's just the last element in a flex-col container. */}
      <div className="border-t border-border bg-card/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <Textarea
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask a question about your data..."
                disabled={isStreaming}
                className="pr-12 py-3 text-sm resize-none bg-background border-input focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-0 rounded-lg shadow-sm block w-full min-h-[44px] max-h-[150px] overflow-y-auto hide-scrollbar"
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isStreaming}
                size="icon"
                className="absolute right-2 bottom-1.5 rounded-md h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                variant="ghost"
              >
                {isStreaming ? (
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 text-center px-2">
            Shift+Enter for new line. AI may make mistakes.
          </p>
        </div>
      </div>
      {/* Helper style to hide scrollbar on the textarea */}
      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
}
