import { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';
import ChatBubble from '../components/chat/ChatBubble';
import ChatInput from '../components/chat/ChatInput';

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (query) => {
    const newMsg = { sender: 'user', text: query };
    setMessages((prev) => [...prev, newMsg]);
    setLoading(true);

    try {
      // call your backend route
      const res = await api.post('/chat/test', {
        tenantId: user.tenantId,
        query,
      });

      if (res.data.status) {
        const reply = {
          sender: 'agent',
          text:
            JSON.stringify(res.data.stateOut.result, null, 2) || 'No result',
        };
        setMessages((prev) => [...prev, reply]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: '⚠️ Error: ' + (err.response?.data?.error || 'Server error'),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-full max-h-[85vh] bg-gray-950 rounded-xl shadow-lg">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-gray-500 text-center mt-20">
              Start a conversation with your AI Data Analyst 🤖
            </p>
          )}
          {messages.map((m, i) => (
            <ChatBubble key={i} message={m} />
          ))}
          {loading && <p className="text-gray-400">Thinking...</p>}
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} />
      </div>
    </Layout>
  );
}
