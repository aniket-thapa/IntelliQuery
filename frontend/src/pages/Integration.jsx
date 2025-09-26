import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';

export default function Integration() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState([]);
  const [form, setForm] = useState({ connectionUri: '', dbName: '' });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');

  const fetchIntegrations = async () => {
    try {
      const res = await api.get(`/integration/${user.tenantId}`);
      if (res.data.status) setIntegrations(res.data.integrations);
    } catch (err) {
      console.error('Integration fetch error:', err);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const res = await api.put(`/integration/${editingId}`, form);
        if (res.data.status) {
          setMessage('Integration updated!');
          setEditingId(null);
          setForm({ connectionUri: '', dbName: '' });
          fetchIntegrations();
        }
      } else {
        const res = await api.post('/integration', {
          tenantId: user.tenantId,
          ...form,
        });
        if (res.data.status) {
          setMessage('Integration added!');
          setForm({ connectionUri: '', dbName: '' });
          fetchIntegrations();
        }
      }
    } catch (err) {
      console.error('Integration save error:', err);
      setMessage('⚠️ Error saving integration');
    }
  };

  const handleEdit = (integration) => {
    setEditingId(integration._id);
    setForm({
      connectionUri: integration.connectionUri,
      dbName: integration.dbName,
    });
  };

  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/integration/${id}`);
      if (res.data.ok || res.data.status) {
        setMessage('Integration deleted!');
        fetchIntegrations();
      }
    } catch (err) {
      console.error('Delete integration error:', err);
    }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Database Integration</h1>

      <form
        onSubmit={handleSave}
        className="bg-gray-900 p-6 rounded-xl shadow-lg mb-6 w-full md:w-2/3"
      >
        <h2 className="text-lg font-semibold mb-3">
          {editingId ? 'Edit Integration' : 'Add MongoDB Integration'}
        </h2>
        <input
          type="text"
          name="connectionUri"
          placeholder="MongoDB Connection URI"
          value={form.connectionUri}
          onChange={handleChange}
          className="w-full p-2 mb-3 rounded bg-gray-800 text-white"
        />
        <input
          type="text"
          name="dbName"
          placeholder="Database Name"
          value={form.dbName}
          onChange={handleChange}
          className="w-full p-2 mb-3 rounded bg-gray-800 text-white"
        />
        <button
          type="submit"
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded"
        >
          {editingId ? 'Update Integration' : 'Save Integration'}
        </button>
        {message && <p className="text-green-400 mt-2">{message}</p>}
      </form>

      <h2 className="text-lg font-semibold mb-3">Existing Integrations</h2>
      {integrations.length ? (
        <ul className="space-y-2">
          {integrations.map((i) => (
            <li
              key={i._id}
              className="p-3 bg-gray-800 rounded flex justify-between items-center"
            >
              <div>
                <p className="font-medium">{i.dbName}</p>
                <p className="text-xs text-gray-400">{i.connectionUri}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(i)}
                  className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(i._id)}
                  className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-400">No integrations yet.</p>
      )}
    </Layout>
  );
}
