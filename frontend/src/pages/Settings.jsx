import { useEffect, useState } from 'react';
import api from '../lib/api';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'member' });
  const [message, setMessage] = useState('');
  const [isOwner, setIsOwner] = useState(false);

  const fetchTenant = async () => {
    try {
      const res = await api.get('/tenant/me');
      if (res.data.tenant) setTenant(res.data.tenant);
    } catch (err) {
      console.error('Tenant fetch error:', err);
    }
  };

  useEffect(() => {
    fetchTenant();
  }, []);

  useEffect(() => {
    if (tenant && user) {
      setIsOwner(tenant.ownerId === user._id);
    }
  }, [tenant, user]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/tenant/invite', form);
      if (res.data.status) {
        setMessage('Invite sent successfully!');
        setForm({ name: '', email: '', role: 'member' });
        fetchTenant();
      } else {
        setMessage('⚠️ ' + res.data.error);
      }
    } catch (err) {
      setMessage('⚠️ Error sending invite');
      console.error('Invite error:', err);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      const res = await api.put(`/user/${memberId}`, { role: newRole });
      if (res.data.status) {
        setMessage('✅ Role updated');
        fetchTenant();
      } else {
        setMessage('⚠️ ' + res.data.error);
      }
    } catch {
      setMessage('⚠️ Failed to update role');
    }
  };

  const handleRemove = async (memberId) => {
    try {
      const res = await api.delete(`/user/${memberId}`);
      if (res.data.status) {
        setMessage('✅ Member removed');
        fetchTenant();
      } else {
        setMessage('⚠️ ' + res.data.error);
      }
    } catch {
      setMessage('⚠️ Failed to remove member');
    }
  };

  const owner = tenant?.members.find(
    (member) => member?._id === tenant?.ownerId
  );

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">
        ⚙️ Settings & Tenant Management
      </h1>

      {/* Tenant Info */}
      {tenant && (
        <div className="bg-gray-900 p-6 rounded-xl shadow-lg mb-6">
          <h2 className="text-lg font-semibold mb-3">🏢 Organization</h2>
          <p>
            <span className="font-medium">Name:</span> {tenant.name}
          </p>
          <p>
            <span className="font-medium">Owner:</span> {owner?.name} (
            {owner?.email})
          </p>
        </div>
      )}

      {/* Invite Members */}
      {isOwner && (
        <div className="bg-gray-900 p-6 rounded-xl shadow-lg mb-6 w-full">
          <h2 className="text-lg font-semibold mb-3">👥 Invite Member</h2>
          <form onSubmit={handleInvite} className="space-y-3">
            <input
              type="text"
              name="name"
              placeholder="Member Name"
              value={form.name}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-800 text-white"
            />
            <input
              type="email"
              name="email"
              placeholder="Member Email"
              value={form.email}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-800 text-white"
            />
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-800 text-white"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
            >
              Send Invite
            </button>
          </form>
          {message && <p className="text-green-400 mt-2">{message}</p>}
        </div>
      )}

      {/* Members List */}
      {tenant && (
        <div className="bg-gray-900 p-6 rounded-xl shadow-lg">
          <h2 className="text-lg font-semibold mb-3">👤 Team Members</h2>
          <ul className="space-y-2">
            {tenant.members?.map((m) => (
              <li
                key={m._id}
                className="flex justify-between items-center p-2 bg-gray-800 rounded"
              >
                <span>
                  {m.name} ({m.email})
                </span>

                <div className="flex gap-2 items-center">
                  {/* Role dropdown for owner/admin */}
                  {isOwner && m._id !== owner._id ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m._id, e.target.value)}
                      className="bg-gray-700 text-white rounded p-1"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className="text-sm text-gray-400">{m.role}</span>
                  )}

                  {/* Remove button for owner */}
                  {isOwner && m._id !== owner._id && (
                    <button
                      onClick={() => handleRemove(m._id)}
                      className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Layout>
  );
}
