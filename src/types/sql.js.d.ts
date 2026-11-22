// The small part of sql.js (SQLite for the browser) that lib/slippipediaRead.ts uses. sql.js ships
// without its own type descriptions; this saves adding a second package for them.
declare module "sql.js" {
  type SqlValue = string | number | null | Uint8Array;
  interface QueryExecResult {
    columns: string[];
    values: SqlValue[][];
  }
  interface Database {
    exec(sql: string): QueryExecResult[];
    export(): Uint8Array;
    close(): void;
  }
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Uint8Array | null) => Database;
  }
  export default function initSqlJs(config?: { locateFile?: (file: string) => string }): Promise<SqlJsStatic>;
}
