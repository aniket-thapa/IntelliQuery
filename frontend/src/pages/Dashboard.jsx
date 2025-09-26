import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';

export default function Dashboard() {
  const { user } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const res = await api.get('/tenant/me');
        setTenant(res.data.tenant);
      } catch (err) {
        console.error('Tenant fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, []);

  const owner = tenant?.members.find(
    (member) => member?._id === tenant?.ownerId
  );

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Card */}
          <div className="bg-gray-900 p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-3">👤 User Profile</h2>
            <p>
              <span className="font-medium">Name:</span> {user?.name}
            </p>
            <p>
              <span className="font-medium">Email:</span> {user?.email}
            </p>
            <p>
              <span className="font-medium">Role:</span> {user?.role}
            </p>
          </div>

          {/* Tenant Card */}
          <div className="bg-gray-900 p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-3">🏢 Organization</h2>
            <p>
              <span className="font-medium">Name:</span> {tenant?.name}
            </p>
            <p>
              <span className="font-medium">Owner:</span> {owner.name || 'N/A'}
            </p>
            <p>
              <span className="font-medium">Members:</span>{' '}
              {tenant?.members?.length}
            </p>
          </div>

          {/* Members List */}
          <div className="md:col-span-2 bg-gray-900 p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-3">👥 Team Members</h2>
            {tenant?.members?.length ? (
              <ul className="space-y-2">
                {tenant.members.map((m) => (
                  <li
                    key={m._id}
                    className="flex justify-between p-2 bg-gray-800 rounded"
                  >
                    <span>
                      {m.name} ({m.email})
                    </span>
                    <span className="text-sm text-gray-400">{m.role}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">No members found.</p>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
