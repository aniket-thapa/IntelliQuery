import { useEffect, useState, useRef } from 'react';
import api from '../lib/api';
import Layout from '../components/layout/Layout';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
ChartJS.register(
  LineElement,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend
);

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const chatRef = useRef(null);
  const bottomRef = useRef(null);

  // Fetch paginated messages
  const fetchMessages = async (p = 1, append = false) => {
    try {
      const res = await api.get(`/chat/messages?page=${p}&limit=10`);
      if (res.data.status) {
        const newMsgs = res.data.messages || [];
        console.log('Fetched messages:', newMsgs);
        setMessages((prev) => (append ? [...newMsgs, ...prev] : newMsgs));
        setHasMore(newMsgs.length >= 10);
      }
    } catch (err) {
      console.error('Error fetching chat:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send user query
  const handleSend = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    const userMsg = {
      _id: Date.now(),
      sender: 'user',
      text: query,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await api.post('/chat', { query });
      if (res.data.status) {
        const agentMsg = {
          _id: Date.now() + 1,
          sender: 'agent',
          text: res.data.finalAnswer,
          data: {
            tableData: res.data.tableData,
            mongoQuery: res.data.mongoQuery,
          },
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, agentMsg]);
      }
    } catch (err) {
      console.error('Error sending query:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete message
  const handleDelete = async (id) => {
    try {
      await api.delete(`/chat/messages/${id}`);
      setMessages((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Load older messages
  const handleScroll = () => {
    if (chatRef.current.scrollTop === 0 && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMessages(nextPage, true);
    }
  };

  return (
    <Layout>
      <div
        className="h-[80vh] overflow-y-auto bg-gray-950 p-6 rounded-xl space-y-6"
        ref={chatRef}
        onScroll={handleScroll}
      >
        {messages.map((msg) =>
          msg.sender === 'user' ? (
            <div key={msg._id} className="flex flex-col items-end gap-1">
              <div className="bg-blue-600 text-white p-3 rounded-xl max-w-xl">
                {msg.text}
              </div>
              <div className="text-xs text-gray-400">
                {new Date(msg.createdAt).toLocaleString()}
              </div>
              <button
                onClick={() => handleDelete(msg._id)}
                className="text-xs text-red-400 hover:underline"
              >
                Delete
              </button>
            </div>
          ) : (
            <AgentMessage key={msg._id} msg={msg} onDelete={handleDelete} />
          )
        )}
        {loading && (
          <p className="text-gray-400 text-sm text-center">
            Processing query...
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="flex gap-3 mt-5 bg-gray-900 p-3 rounded-lg"
      >
        <input
          type="text"
          placeholder="Ask your data question..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 p-2 bg-gray-800 text-white rounded"
        />
        <button
          disabled={loading}
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
        >
          {loading ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </Layout>
  );
}

/* ---------- Agent Message ---------- */
function AgentMessage({ msg, onDelete }) {
  const data = msg.data || {};
  const tableData = data.tableData || {};
  const mongoQuery = data.mongoQuery || null;
  const viz = tableData.visualization || null;
  const rows = tableData.rows || [];
  const columns = tableData.tableConfig?.columns || [];
  const finalAnswer =
    msg.text ||
    data.finalAnswer ||
    tableData.markdownAnalysis ||
    'No analysis available.';

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="bg-gray-800 text-gray-100 p-4 rounded-xl max-w-3xl w-full">
        {/* Markdown Summary */}
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 prose prose-invert markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {finalAnswer}
          </ReactMarkdown>
        </div>

        {/* Collapsible Visualization */}
        {viz && (
          <details className="bg-gray-900 p-3 rounded-lg mt-3">
            <summary className="cursor-pointer font-semibold">
              📊 Show Visualization
            </summary>
            <div className="mt-3">
              <Visualization viz={viz} />
            </div>
          </details>
        )}

        {/* Collapsible Table */}
        {rows.length > 0 && columns.length > 0 && (
          <details className="bg-gray-900 p-3 rounded-lg mt-3">
            <summary className="cursor-pointer font-semibold">
              📋 Show Data Table
            </summary>
            <div className="overflow-x-auto mt-3 border border-gray-700 rounded-lg">
              <table className="min-w-full text-sm text-gray-300">
                <thead className="bg-gray-800 text-gray-200">
                  <tr>
                    {columns.map((c) => (
                      <th key={c.key} className="px-3 py-2 text-left">
                        {c.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={i}
                      className="odd:bg-gray-900 even:bg-gray-800 hover:bg-gray-700"
                    >
                      {columns.map((c) => (
                        <td key={c.key} className="px-3 py-2">
                          {renderCell(r, c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}

        {/* Collapsible Mongo Query */}
        {mongoQuery && (
          <details className="bg-gray-900 p-3 rounded-lg mt-3">
            <summary className="cursor-pointer font-semibold">
              🧠 Show MongoDB Query
            </summary>
            <pre className="text-gray-400 text-xs mt-2 overflow-x-auto">
              {JSON.stringify(mongoQuery, null, 2)}
            </pre>
          </details>
        )}
      </div>

      <div className="text-xs text-gray-400">
        {new Date(msg.createdAt).toLocaleString()}
      </div>
      <button
        onClick={() => onDelete(msg._id)}
        className="text-xs text-red-400 hover:underline"
      >
        Delete
      </button>
    </div>
  );
}

/* ---------- Table + Chart Helpers ---------- */
function renderCell(row, col) {
  const val = row[col.key];
  switch (col.renderAs) {
    case 'date':
      return val ? new Date(val).toLocaleDateString() : '';
    case 'list':
      return Array.isArray(val)
        ? val.map((v) => v[col.sourceField]).join(', ')
        : '';
    case 'count':
      return Array.isArray(val) ? val.length : 0;
    case 'link':
      return (
        <a
          href={val}
          target="_blank"
          rel="noreferrer"
          className="text-blue-400 underline"
        >
          {val}
        </a>
      );
    default:
      return typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
  }
}

function Visualization({ viz }) {
  if (!viz?.data?.labels) return <p>No visualization data.</p>;

  const chartData = {
    labels: viz.data.labels,
    datasets: viz.data.datasets.map((d) => ({
      ...d,
      borderColor: '#3b82f6',
      backgroundColor:
        viz.type === 'pie'
          ? [
              '#60a5fa',
              '#34d399',
              '#fbbf24',
              '#f87171',
              '#a78bfa',
              '#f472b6',
              '#22d3ee',
            ]
          : 'rgba(59,130,246,0.4)',
      fill: viz.type === 'line',
    })),
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#fff' } },
      title: { display: !!viz.title, text: viz.title, color: '#fff' },
    },
    scales:
      viz.type !== 'pie'
        ? {
            x: { ticks: { color: '#bbb' }, grid: { color: '#333' } },
            y: { ticks: { color: '#bbb' }, grid: { color: '#333' } },
          }
        : {},
  };

  switch (viz.type) {
    case 'line':
      return <Line data={chartData} options={options} />;
    case 'bar':
      return <Bar data={chartData} options={options} />;
    case 'pie':
      return <Pie data={chartData} options={options} />;
    default:
      return <p>Unsupported chart type.</p>;
  }
}
