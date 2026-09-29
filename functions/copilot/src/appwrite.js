import { Client } from 'node-appwrite';

export const DATABASE_ID = 'crm';

/** Shorthand for the database and table parameters of TablesDB calls. */
export const table = (tableId) => ({ databaseId: DATABASE_ID, tableId });

/**
 * Creates an Appwrite client that acts as the user who started the execution.
 * Appwrite sends a short-lived JWT for that user in the x-appwrite-user-jwt
 * header, so every request made with this client follows the user's own
 * permissions. Returns null when no signed-in user started the execution.
 */
export function userClient(req) {
  const jwt = req.headers['x-appwrite-user-jwt'];
  if (!jwt) return null;

  return new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setJWT(jwt);
}
