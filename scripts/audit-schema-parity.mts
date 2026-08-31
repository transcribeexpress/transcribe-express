import { getTableColumns, sql } from "drizzle-orm";
import {
  creditRechargeHistory,
  gdprRequests,
  subscriptions,
  supportTickets,
  transcriptions,
  userPreferences,
  users,
} from "../drizzle/schema";
import { getDb } from "../server/db";

const managedTables = {
  users,
  transcriptions,
  subscriptions,
  creditRechargeHistory,
  userPreferences,
  supportTickets,
  gdprRequests,
} as const;

type InformationSchemaRow = {
  tableName: string;
  columnName: string;
};

function normalizeRows(result: unknown): InformationSchemaRow[] {
  if (!Array.isArray(result)) return [];
  const rows = Array.isArray(result[0]) ? result[0] : result;
  return rows as InformationSchemaRow[];
}

const db = await getDb();
if (!db) throw new Error("Database unavailable for read-only schema audit");

const tableNames = Object.keys(managedTables);
const quotedNames = tableNames.map((name) => `'${name}'`).join(", ");
const result = await db.execute(sql.raw(`
  SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN (${quotedNames})
  ORDER BY TABLE_NAME, ORDINAL_POSITION
`));

const rows = normalizeRows(result);
const actualByTable = new Map<string, Set<string>>();
for (const row of rows) {
  const columns = actualByTable.get(row.tableName) ?? new Set<string>();
  columns.add(row.columnName);
  actualByTable.set(row.tableName, columns);
}

let hasMismatch = false;

for (const [tableName, table] of Object.entries(managedTables)) {
  const expected = new Set(
    Object.values(getTableColumns(table)).map((column) => column.name)
  );
  const actual = actualByTable.get(tableName) ?? new Set<string>();
  const missing = [...expected].filter((name) => !actual.has(name));
  const untracked = [...actual].filter((name) => !expected.has(name));

  if (missing.length || untracked.length) hasMismatch = true;

  console.log(
    JSON.stringify({
      table: tableName,
      expectedColumns: expected.size,
      actualColumns: actual.size,
      missing,
      untracked,
    })
  );
}

if (hasMismatch) {
  throw new Error("Schema parity audit failed");
}

console.log("Schema parity audit passed (read-only).");
