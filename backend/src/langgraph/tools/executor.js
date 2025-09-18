// src/langgraph/tools/executor.js
import { getTenantDb } from '../../utils/mongoClient.js'; // your helper that returns a connected db for tenant
import { setTimeout as sleep } from 'timers/promises';

/**
 * executeTenantQuery: safely executes the parsed mongoQuery on the tenant DB.
 * - Only read operations (find + aggregate allowed)
 * - Accepts simple find queries in the shape { collection, filter, projection, limit }
 */
export default async function executeTenantQuery({
  tenantId,
  mongoQuery,
  timeoutMs = 20000,
}) {
  if (!tenantId) throw new Error('tenantId required');
  if (!mongoQuery) throw new Error('mongoQuery required');

  // Disallow dangerous keys inside filter or anywhere (best-effort)
  const serialized = JSON.stringify(mongoQuery).toLowerCase();
  const forbidden = [
    '$where',
    'mapreduce',
    'eval',
    'system.profile',
    'drop',
    'remove',
    'delete',
    'update',
  ];
  for (const f of forbidden) {
    if (serialized.includes(f)) {
      return { error: 'Query contains forbidden operation' };
    }
  }

  // Get tenant DB (cached client)
  const db = await getTenantDb(String(tenantId));

  // Execute with timeout: we race query promise vs timeout
  try {
    const run = async () => {
      if (mongoQuery.aggregate) {
        // allow aggregate pipelines if provided
        const pipeline = mongoQuery.aggregate;
        const col = db.collection(mongoQuery.collection);
        const rows = await col
          .aggregate(pipeline, { maxTimeMS: timeoutMs })
          .toArray();
        return rows;
      } else {
        const col = db.collection(mongoQuery.collection);
        const cursor = col.find(mongoQuery.filter || {}, {
          projection: mongoQuery.projection || {},
        });
        if (mongoQuery.limit) cursor.limit(mongoQuery.limit);
        const rows = await cursor.toArray();
        return rows;
      }
    };

    // race promise and timeout
    const promise = run();
    const timeout = sleep(timeoutMs, { value: { error: 'Query timed out' } });

    const result = await Promise.race([promise, timeout]);
    return { ok: true, rows: result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
