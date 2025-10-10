// src/utils/mongoClient.js
import { MongoClient } from 'mongodb';
import Integration from '../models/Integration.js';
import { decrypt } from './crypto.js';

const clientCache = new Map();

export async function getTenantDb(tenantId) {
  if (!tenantId) throw new Error('tenantId required');

  if (clientCache.has(tenantId)) {
    return clientCache.get(tenantId).db;
  }

  const integration = await Integration.findOne({ tenantId, status: 'active' });
  if (!integration) throw new Error('No active integration for tenant');

  // 2. Decrypt the connection string before using it
  const decryptedUri = decrypt(integration.connectionUri);

  // The connection options are deprecated in recent versions of the driver
  const client = new MongoClient(decryptedUri); // <-- 3. Use the decrypted URI

  try {
    await client.connect();
    const db = client.db(integration.dbName);

    clientCache.set(tenantId, { client, db });

    return db;
  } catch (error) {
    console.error(`Failed to connect to tenant DB for ${tenantId}`, error);
    // Ensure a failed client isn't cached
    await client.close();
    throw new Error('Could not establish tenant database connection.');
  }
}

export async function closeTenantDb(tenantId) {
  const entry = clientCache.get(tenantId);
  if (entry) {
    await entry.client.close();
    clientCache.delete(tenantId);
  }
}
