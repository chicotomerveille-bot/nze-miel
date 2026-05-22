const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_URL || process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

function toPg(sql) {
  let s = sql
    .replace(/datetime\('now', '\+1 hour'\)/g, "NOW() + INTERVAL '1 hour'")
    .replace(/datetime\('now'\)/g, 'NOW()')
    .replace(/date\('now'\)/g, 'CURRENT_DATE')
    .replace(/strftime\('%Y-%m', created_at\)/g, "to_char(created_at, 'YYYY-MM')")
    .replace(/strftime\('%Y-%m', s\.created_at\)/g, "to_char(s.created_at, 'YYYY-MM')");
  let i = 0;
  s = s.replace(/\?/g, () => `$${++i}`);
  return s;
}

function prepare(sql) {
  return {
    run: async (...params) => {
      const pgSql = toPg(sql);
      const finalSql = pgSql.trim().toUpperCase().startsWith('INSERT')
        ? pgSql + ' RETURNING id'
        : pgSql;
      const result = await pool.query(finalSql, params);
      return { lastInsertRowid: result.rows[0]?.id };
    },
    get: async (...params) => {
      const result = await pool.query(toPg(sql), params);
      return result.rows[0];
    },
    all: async (...params) => {
      const result = await pool.query(toPg(sql), params);
      return result.rows;
    }
  };
}

module.exports = { prepare, pool };
