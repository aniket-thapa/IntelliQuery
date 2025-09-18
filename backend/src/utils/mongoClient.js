// src/utils/mongoClient.js
import { MongoClient } from 'mongodb';
import Integration from '../models/Integration.js';

const clientCache = new Map(); // tenantId -> { client, db }

export async function getTenantDb(tenantId) {
  if (!tenantId) throw new Error('tenantId required');

  if (clientCache.has(tenantId)) {
    return clientCache.get(tenantId).db;
  }

  // Find tenant integration
  const integration = await Integration.findOne({ tenantId, status: 'active' });
  if (!integration) throw new Error('No active integration for tenant');

  const client = new MongoClient(integration.connectionUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await client.connect();
  const db = client.db(integration.dbName);

  clientCache.set(tenantId, { client, db });

  return db;
}

export async function closeTenantDb(tenantId) {
  const entry = clientCache.get(tenantId);
  if (entry) {
    await entry.client.close();
    clientCache.delete(tenantId);
  }
}
