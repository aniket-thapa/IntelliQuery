import { useState, useRef, useEffect, useCallback, memo } from 'react';
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
  Square,
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
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
  const isLoadingMoreRef = useRef(false);

  const fetchMessages = useCallback(
    async (page) => {
      if (isLoadingMoreRef.current || !token) return;

      isLoadingMoreRef.current = true;
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
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    },
    [token]
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
    if (hasMore && !isLoadingMoreRef.current) {
      fetchMessages(currentPage + 1);
    }
  }, [hasMore, currentPage, fetchMessages]);

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

      const eventSourceUrl = `${api.defaults.baseURL
        }/chat?query=${encodeURIComponent(query)}&token=${token}`;
      eventSourceRef.current = new EventSource(eventSourceUrl);

      let finalAgentData = null;

      eventSourceRef.current.onmessage = (event) => {
        if (event.data === '[DONE]') {
          console.log('SSE stream completed.');
          if (eventSourceRef.current) eventSourceRef.current.close();
          setIsStreaming(false);
          setCurrentStep('');
          eventSourceRef.current = null;

          if (finalAgentData && (finalAgentData.finalAnswer || finalAgentData.tableData?.rows)) {
            fetchMessages(1);
            setPartialAnswer('');
          } else if (partialAnswer) {
            console.warn('Stream closed, using partialAnswer as final message.');
            fetchMessages(1);
            setPartialAnswer('');
          } else {
            console.warn('Stream closed but no final data or partial answer was available.');
            // Refetch anyway just in case backend saved something
            fetchMessages(1);
          }
          return;
        }

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

  const stopGenerating = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
    setCurrentStep('');
    setPartialAnswer('');
    fetchMessages(1);
  }, [fetchMessages]);

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
    stopGenerating,
  };
};

// --- Chart Rendering Component (REFACTORED) ---
// This now uses CSS variables from ShadCN/Tailwind for theme-awareness
const ChartRenderer = ({ visualization }) => {
  if (!visualization || !visualization.data || !visualization.type) {
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

// --- Helper functions for data extraction ---
const getNestedValue = (obj, path) => {
  if (obj === null || obj === undefined) return undefined;
  if (Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];

  const parts = path.split('.');
  if (parts.length === 1) return undefined;

  return parts.reduce((acc, part) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[part];
  }, obj);
};

const resolveRows = (originalRows, columns) => {
  if (!originalRows || !Array.isArray(originalRows) || originalRows.length === 0 || !columns) return [];

  try {
    const hasAnyKey = columns.some(col => getNestedValue(originalRows[0], col.key) !== undefined);
    if (hasAnyKey) return originalRows;

    if (originalRows.length === 1) {
      const row = originalRows[0];
      for (const key in row) {
        if (Array.isArray(row[key]) && row[key].length > 0) {
          const firstItem = row[key][0];
          if (typeof firstItem === 'object' && firstItem !== null) {
            const arrayHasAnyKey = columns.some(col => getNestedValue(firstItem, col.key) !== undefined);
            if (arrayHasAnyKey) {
              return row[key];
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn("resolveRows encountered an error", e);
  }
  return originalRows;
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
    tableConfig.columns.map((col) => escapeCsvCell(getNestedValue(row, col.key))).join(',')
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
const ChatMessageComponent = memo(({ message, onDelete }) => {
  const isAgent = message.sender === 'agent';

  const tableData = message.data?.tableData;
  const visualization = tableData?.visualization;
  const tableConfig = tableData?.tableConfig;
  const rows = tableData?.rows;
  const displayRows = rows && tableConfig ? resolveRows(rows, tableConfig.columns) : rows;

  const handleExportClick = () => {
    const filename = `intelliquery_export_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCsv(filename, tableConfig, displayRows);
    toast.success('CSV Exported!');
  };

  if (!isAgent) {
    return (
      <div className="group relative flex flex-col items-end px-4 py-3 sm:px-6 md:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-1.5 opacity-70 px-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">You</span>
        </div>
        <div className="relative group/bubble flex flex-row items-center gap-2 max-w-[85%] sm:max-w-[75%]">
          {message._id && !message._id.startsWith('temp-') && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-7 w-7 opacity-0 md:group-hover/bubble:opacity-100 transition-opacity rounded-full hover:bg-muted text-muted-foreground self-center"
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
          <div className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground px-5 py-3 rounded-2xl rounded-tr-sm shadow-md break-words min-w-0">
            <div className="text-sm text-primary-foreground/95 [&>p]:leading-relaxed [&>p]:m-0 [&>p]:text-primary-foreground/95 [&_strong]:text-primary-foreground [&_strong]:font-semibold">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex gap-4 px-4 py-6 sm:px-6 md:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-5xl mx-auto">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mt-0.5 shadow-sm">
        <Bot className="w-5 h-5" />
      </div>
      <div className="flex-1 space-y-3 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">AI Assistant</span>
            <span className="text-xs text-muted-foreground/60 font-medium">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {message._id && !message._id.startsWith('temp-') && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-muted text-muted-foreground"
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

        <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50 rounded">
          {message.text && (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <SyntaxHighlighter
                      {...props}
                      children={String(children).replace(/\n$/, '')}
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      className="rounded-lg border border-border/50 shadow-sm my-4 text-[13px]"
                    />
                  ) : (
                    <code {...props} className={`${className} bg-muted px-1.5 py-0.5 rounded-md text-primary font-mono text-[13px]`}>
                      {children}
                    </code>
                  )
                }
              }}
            >
              {message.text}
            </ReactMarkdown>
          )}

          {tableConfig && rows && rows.length > 0 && (
            <div className="md:my-6 my-4 relative group/table">
              <div className="max-h-[60vh] overflow-x-auto border border-border/60 rounded-xl shadow-sm bg-card/50 backdrop-blur-sm scrollbar-thin">
                <table className="w-full divide-y divide-border/60 text-sm">
                  <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      {tableConfig.columns.map((col) => (
                        <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {displayRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-muted/30 transition-colors">
                        {tableConfig.columns.map((col) => (
                          <td key={col.key} className="px-4 py-2.5 text-foreground/90 whitespace-nowrap">
                            {renderCellContent(getNestedValue(row, col.key), col)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TooltipProvider>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="absolute -top-3 -right-3 h-8 w-8 rounded-full shadow-sm md:opacity-0 md:group-hover/table:opacity-100 transition-all duration-200 bg-background hover:bg-muted hover:scale-105 border-border"
                    onClick={handleExportClick}
                  >
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" align="center" className="text-xs">
                  <p>Export CSV</p>
                </TooltipContent>
              </TooltipProvider>
            </div>
          )}

          {visualization && <ChartRenderer visualization={visualization} />}
        </div>
      </div>
    </div>
  );
});

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
const StreamingMessageComponent = memo(({ currentStep, partialAnswer }) => {
  const stepClass = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium tracking-wide uppercase shadow-sm border border-primary/20';
  const dotClass = 'w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce';

  const cursorStyle = {
    display: 'inline-block',
    width: '6px',
    height: '1.2em',
    backgroundColor: 'currentColor',
    animation: 'blink 1s step-end infinite',
    marginLeft: '4px',
    verticalAlign: 'text-bottom',
    opacity: 0.8
  };

  const keyframes = `
      @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
      }
  `;

  return (
    <>
      <style>{keyframes}</style>
      <div className="group relative flex gap-4 px-4 py-6 sm:px-6 md:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-5xl mx-auto">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mt-0.5 shadow-sm">
          <Bot className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex-1 space-y-4 min-w-0">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm text-foreground">AI Assistant</span>
            {currentStep && (
              <div className={stepClass}>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>
                  {currentStep
                    .replace(/_/g, ' ')
                    .replace('queryClassifier', 'Analyzing Request')
                    .replace('schemaSearch', 'Searching Schema')
                    .replace('queryGen', 'Generating Query')
                    .replace('executor', 'Executing Query')
                    .replace('responseFormatter', 'Formatting Response')}
                </span>
              </div>
            )}
          </div>
          {partialAnswer ? (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed rounded">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <SyntaxHighlighter
                        {...props}
                        children={String(children).replace(/\n$/, '')}
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-lg border border-border/50 shadow-sm my-4 text-[13px]"
                      />
                    ) : (
                      <code {...props} className={`${className} bg-muted px-1.5 py-0.5 rounded-md text-primary font-mono text-[13px]`}>
                        {children}
                      </code>
                    )
                  }
                }}
              >
                {partialAnswer}
              </ReactMarkdown>
              <span style={cursorStyle}></span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground/70 py-1">
              <div className="flex gap-1.5">
                <span className={dotClass} style={{ animationDelay: '0ms' }} />
                <span className={dotClass} style={{ animationDelay: '150ms' }} />
                <span className={dotClass} style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
});

// --- DashboardPage (Main Component - REFACTORED) ---
export default function DashboardPage() {
  const { token } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const scrollAreaRef = useRef(null);
  const textareaRef = useRef(null);
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
    stopGenerating,
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
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'; // Reset height
      }
      setIsScrolledToBottom(true);
      // Force scroll to bottom immediately on send
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
      }, 0);
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10" />

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto scroll-smooth scrollbar-thin pb-32"
        onScroll={handleScroll}
        ref={scrollAreaRef}
      >
        <div className="w-full">
          {hasMore && (
            <div className="flex justify-center py-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMoreMessages}
                disabled={isLoadingMore}
                className="gap-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 border border-transparent hover:border-border/30 transition-all shadow-sm"
              >
                {isLoadingMore ? (
                  <><LoaderCircle className="w-4 h-4 animate-spin" /> Loading...</>
                ) : (
                  <><ChevronUp className="w-4 h-4" /> Load older messages</>
                )}
              </Button>
            </div>
          )}

          {messages.length === 0 && !isStreaming && !isLoadingMore ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in duration-700">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-sm border border-primary/10">
                <Bot className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground mb-3">
                Hello, I'm IntelliQuery.
              </h2>
              <p className="text-muted-foreground/80 max-w-md text-base leading-relaxed">
                I can understand your database schema and answer complex questions in natural language. Ask me to generate insights, tables, or charts!
              </p>
            </div>
          ) : (
            <div className="w-full space-y-2 py-4">
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
          <div ref={messagesEndRef} className="h-px" />
        </div>
      </div>

      {/* Input Area (Glassmorphism) */}
      <div className="absolute bottom-0 w-full bg-background/70 backdrop-blur-xl border-t border-border/40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          {isStreaming && (
            <div className="flex justify-center mb-4 absolute -top-12 left-0 right-0">
              <Button
                onClick={stopGenerating}
                variant="outline"
                size="sm"
                className="gap-2 rounded-full px-5 py-1 text-[13px] font-medium shadow-md bg-background/90 hover:bg-muted border-border/60 hover:scale-105 transition-transform"
              >
                <Square className="w-3 h-3 fill-current" /> Stop generating
              </Button>
            </div>
          )}
          <div className="relative flex items-end gap-2 group/input">
            <div className="flex-1 relative rounded-2xl overflow-hidden shadow-sm border border-input focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all bg-card/50">
              <Textarea
                ref={textareaRef}
                rows={1}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                placeholder="Ask anything about your data..."
                disabled={isStreaming}
                className="w-full min-h-[52px] max-h-[200px] bg-transparent border-0 py-3.5 pl-4 pr-14 text-[15px] resize-none focus-visible:ring-0 placeholder:text-muted-foreground/60 scrollbar-thin"
              />
              <div className="absolute right-2 bottom-2">
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isStreaming}
                  size="icon"
                  className={`h-9 w-9 rounded-xl transition-all duration-300 ${inputValue.trim() && !isStreaming ? 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90' : 'bg-muted text-muted-foreground'}`}
                >
                  {isStreaming ? (
                    <LoaderCircle className="w-4.5 h-4.5 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 ml-0.5" />
                  )}
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground/60 mt-2.5 text-center px-2 font-medium">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
