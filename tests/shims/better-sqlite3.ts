// @ts-expect-error
import BetterDatabase from '../../node_modules/better-sqlite3/lib/index.js';

function mapArgs(args: any[]) {
  return args.map((val) => {
    if (val === undefined) return null;
    if (typeof val === 'boolean') return val ? 1 : 0;
    if (val !== null && typeof val === 'object' && !Buffer.isBuffer(val)) {
      return JSON.stringify(val);
    }
    return val;
  });
}

function wrapMethod(stmt: any, methodName: string) {
  const original = stmt[methodName];
  if (typeof original !== 'function') return;
  stmt[methodName] = function (...args: any[]) {
    let mappedArgs = args;
    if (args.length === 1 && Array.isArray(args[0])) {
      mappedArgs = [mapArgs(args[0])];
    } else if (
      args.length === 1 &&
      args[0] !== null &&
      typeof args[0] === 'object' &&
      !Buffer.isBuffer(args[0])
    ) {
      const obj = args[0];
      const mappedObj: any = {};
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (val === undefined) mappedObj[key] = null;
        else if (typeof val === 'boolean') mappedObj[key] = val ? 1 : 0;
        else if (
          val !== null &&
          typeof val === 'object' &&
          !Buffer.isBuffer(val)
        )
          mappedObj[key] = JSON.stringify(val);
        else mappedObj[key] = val;
      }
      mappedArgs = [mappedObj];
    } else {
      mappedArgs = mapArgs(args);
    }
    return original.apply(this, mappedArgs);
  };
}

const DatabaseWrapper = function (this: any, filename: string, options?: any) {
  const db = new BetterDatabase(filename, options);

  const originalPrepare = db.prepare.bind(db);
  db.prepare = function (sql: string) {
    const stmt = originalPrepare(sql);
    wrapMethod(stmt, 'run');
    wrapMethod(stmt, 'all');
    wrapMethod(stmt, 'get');
    wrapMethod(stmt, 'values');
    wrapMethod(stmt, 'iterate');
    return stmt;
  };

  return db;
} as any;

// Inherit prototype properties
DatabaseWrapper.prototype = BetterDatabase.prototype;

export default DatabaseWrapper;
