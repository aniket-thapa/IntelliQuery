import { useState, useEffect } from 'react';
import api from '../lib/api';
import Layout from '../components/layout/Layout';

export default function Onboarding() {
  const [schema, setSchema] = useState(null);
  const [schemaText, setSchemaText] = useState(
    `{
  "databaseName": "YOUR_DATABASE_NAME",
  "collections": [
    {
      "name": "COLLECTION_NAME",
      "description": "What this collection stores",
      "fields": [
        {
          "name": "FIELD_NAME",
          "type": "string",
          "description": "Meaning of this field",
          "synonyms": ["optionalAlias1"]
        }
      ]
    }
  ]
}`
  );
  const [message, setMessage] = useState('');

  const fetchSchema = async () => {
    try {
      const res = await api.get('/onboarding/schema');
      if (res.data.status) {
        setSchema(res.data.schema);
        setSchemaText(JSON.stringify(res.data.schema, null, 2));
      }
    } catch (err) {
      setSchema(null);
      console.log('No schema found yet', err);
    }
  };

  useEffect(() => {
    fetchSchema();
  }, []);

  const handleUpload = async () => {
    try {
      const parsed = JSON.parse(schemaText);
      const res = await api.post('/onboarding/schema', parsed);
      if (res.data.status) {
        setMessage('Schema uploaded successfully!');
        fetchSchema();
      }
    } catch {
      setMessage('⚠️ Invalid schema JSON or server error');
    }
  };

  const handleUpdate = async () => {
    try {
      const parsed = JSON.parse(schemaText);
      const res = await api.put('/onboarding/schema', parsed);
      if (res.data.status) {
        setMessage('Schema updated successfully!');
        fetchSchema();
      }
    } catch {
      setMessage('⚠️ Invalid schema JSON or server error');
    }
  };

  const handleDelete = async () => {
    try {
      const res = await api.delete('/onboarding/schema');
      if (res.data.status) {
        setMessage('Schema deleted successfully!');
        setSchema(null);
        setSchemaText('');
      }
    } catch {
      setMessage('⚠️ Failed to delete schema');
    }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">
        Onboarding - Schema Management
      </h1>

      {/* Schema Editor */}
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">Schema JSON</h2>
        <textarea
          rows={15}
          value={schemaText}
          onChange={(e) => setSchemaText(e.target.value)}
          className="w-full p-2 mb-3 rounded bg-gray-800 text-white font-mono"
        />
        <div className="flex gap-3">
          <button
            onClick={handleUpload}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
          >
            Upload
          </button>
          <button
            onClick={handleUpdate}
            className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded"
          >
            Update
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded"
          >
            Delete
          </button>
        </div>
        {message && <p className="text-green-400 mt-2">{message}</p>}
      </div>

      {/* Show Current Schema */}
      {schema && (
        <div className="bg-gray-900 p-6 rounded-xl shadow-lg">
          <h2 className="text-lg font-semibold mb-3">Current Schema</h2>
          <pre className="bg-gray-800 p-4 rounded text-sm overflow-x-auto">
            {JSON.stringify(schema, null, 2)}
          </pre>
        </div>
      )}
    </Layout>
  );
}
