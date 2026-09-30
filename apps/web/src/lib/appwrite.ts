import { Account, Client, Functions, Realtime, TablesDB, Teams } from 'appwrite';
import type { TableId } from './types';

export const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const tablesDB = new TablesDB(client);
export const functions = new Functions(client);
export const teams = new Teams(client);
export const realtime = new Realtime(client);

export const DATABASE_ID = 'crm';
export const SCOUT_FUNCTION_ID = 'copilot';

/** Shorthand for the database and table parameters of TablesDB calls. */
export const table = (tableId: TableId) => ({ databaseId: DATABASE_ID, tableId });
