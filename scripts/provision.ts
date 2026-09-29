import { TablesDB, TablesDBIndexType, Teams } from 'node-appwrite';
import { client, exists, find, run } from './client.ts';
import {
  DATABASE_ID,
  DATABASE_NAME,
  TABLES,
  TEAMS,
  type Column,
  type Index,
  type TableSpec,
} from './schema.ts';

/**
 * Creates the Cairn database, its tables, and the teams. Safe to run again:
 * existing resources get their settings re-applied, missing columns and
 * indexes are added, and nothing is ever deleted.
 */

const tablesDB = new TablesDB(client);
const teams = new Teams(client);

await run(async () => {
  await ensureDatabase();
  for (const table of TABLES) await ensureTable(table);
  for (const team of TEAMS) await ensureTeam(team.teamId, team.name);
  console.log('Provisioning finished.');
});

async function ensureDatabase() {
  if (await exists(() => tablesDB.get({ databaseId: DATABASE_ID }))) {
    console.log(`Database ${DATABASE_ID} exists`);
    return;
  }
  await tablesDB.create({ databaseId: DATABASE_ID, name: DATABASE_NAME });
  console.log(`Created database ${DATABASE_ID}`);
}

async function ensureTable({ tableId, name, permissions, columns, indexes }: TableSpec) {
  const target = { databaseId: DATABASE_ID, tableId };
  const table = await find(() => tablesDB.getTable(target));

  if (!table) {
    // One request creates the table with all of its columns and indexes.
    await tablesDB.createTable({
      ...target,
      name,
      permissions,
      rowSecurity: true,
      columns,
      indexes,
    });
    console.log(`Created table ${tableId}`);
  } else {
    await tablesDB.updateTable({ ...target, permissions, rowSecurity: true });
    for (const column of columns) {
      if (await exists(() => tablesDB.getColumn({ ...target, key: column.key }))) continue;
      await createColumn(tableId, column);
      console.log(`Added column ${tableId}.${column.key}`);
    }
    console.log(`Table ${tableId} exists, settings re-applied`);
  }

  // Columns and indexes build in the background. Indexes need their columns first.
  for (const column of columns) {
    await waitUntilAvailable(`${tableId}.${column.key}`, () =>
      tablesDB.getColumn({ ...target, key: column.key }),
    );
  }
  for (const index of indexes) {
    if (!(await exists(() => tablesDB.getIndex({ ...target, key: index.key })))) {
      await createIndex(tableId, index);
      console.log(`Added index ${tableId}.${index.key}`);
    }
    await waitUntilAvailable(`${tableId}.${index.key}`, () =>
      tablesDB.getIndex({ ...target, key: index.key }),
    );
  }
}

async function ensureTeam(teamId: string, name: string) {
  const team = await find(() => teams.get({ teamId }));
  if (!team) {
    await teams.create({ teamId, name });
    console.log(`Created team ${teamId}`);
  } else if (team.name !== name) {
    await teams.updateName({ teamId, name });
    console.log(`Renamed team ${teamId}`);
  } else {
    console.log(`Team ${teamId} exists`);
  }
}

function createColumn(tableId: string, column: Column) {
  const base = { databaseId: DATABASE_ID, tableId, key: column.key, required: column.required };
  switch (column.type) {
    case 'varchar':
      return tablesDB.createVarcharColumn({ ...base, size: column.size });
    case 'text':
      return tablesDB.createTextColumn(base);
    case 'email':
      return tablesDB.createEmailColumn(base);
    case 'boolean':
      return tablesDB.createBooleanColumn(base);
    case 'datetime':
      return tablesDB.createDatetimeColumn(base);
    case 'integer':
      return tablesDB.createIntegerColumn({ ...base, min: column.min, max: column.max });
    case 'enum':
      return tablesDB.createEnumColumn({ ...base, elements: column.elements });
  }
}

function createIndex(tableId: string, index: Index) {
  return tablesDB.createIndex({
    databaseId: DATABASE_ID,
    tableId,
    key: index.key,
    type: index.type === 'fulltext' ? TablesDBIndexType.Fulltext : TablesDBIndexType.Key,
    columns: index.attributes,
  });
}

async function waitUntilAvailable(
  label: string,
  get: () => Promise<{ status: string; error?: string }>,
) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const { status, error } = await get();
    if (status === 'available') return;
    if (status === 'failed' || status === 'stuck')
      throw new Error(`${label} is ${status}: ${error}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} did not become available in 30 seconds`);
}
