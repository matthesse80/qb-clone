// Both adapters expose the same transaction/query contract. Production supplies
// an already-configured pg Pool; this module never handles credentials.
export function postgresDatabase(pool) {
  return {
    query: (sql, values) => pool.query(sql, values),
    async transaction(work) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    }
  };
}

export const embeddedDatabase = db => ({ query: (sql, values) => db.query(sql, values),
  transaction: work => db.transaction(work) });
