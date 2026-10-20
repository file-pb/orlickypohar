// Náhrada `expo-sqlite` nad `node:sqlite`. Vystavuje jen to, co tracker
// používá, a se stejnou semantikou — jde o to otestovat naše SQL a dotazy,
// ne SQLite.
import { DatabaseSync } from 'node:sqlite';

class Statement {
  constructor(st) { this.st = st; }
  executeSync(params) {
    const p = params && typeof params === 'object' && !Array.isArray(params)
      ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k.replace(/^\$/, ''), v]))
      : params;
    const r = this.st.run(p ?? {});
    return {
      changes: Number(r.changes),
      lastInsertRowId: Number(r.lastInsertRowid),
      resetSync() {},
      finalizeSync() {},
    };
  }
  finalizeSync() {}
}

class Db {
  constructor(name) { this.db = new DatabaseSync(name); }
  execSync(sql) { this.db.exec(sql); }
  runSync(sql, params = []) {
    const r = this.db.prepare(sql).run(...(Array.isArray(params) ? params : [params]));
    return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
  }
  getFirstSync(sql, params = []) {
    return this.db.prepare(sql).get(...(Array.isArray(params) ? params : [params])) ?? null;
  }
  getAllSync(sql, params = []) {
    return this.db.prepare(sql).all(...(Array.isArray(params) ? params : [params]));
  }
  prepareSync(sql) { return new Statement(this.db.prepare(sql)); }
  withTransactionSync(fn) {
    this.db.exec('BEGIN');
    try { fn(); this.db.exec('COMMIT'); } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  closeSync() { this.db.close(); }
}

export function openDatabaseSync(name) {
  return new Db(process.env.TEST_DB ?? ':memory:');
}
