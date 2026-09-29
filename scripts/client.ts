import { AppwriteException, Client } from 'node-appwrite';

/** A server client for the setup scripts. The API key never leaves your machine. */
export const client = new Client()
  .setEndpoint(requireEnv('APPWRITE_ENDPOINT'))
  .setProject(requireEnv('APPWRITE_PROJECT_ID'))
  .setKey(requireEnv('APPWRITE_API_KEY'));

/** Returns the resource, or null when Appwrite answers 404. */
export async function find<T>(get: () => Promise<T>): Promise<T | null> {
  try {
    return await get();
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) return null;
    throw err;
  }
}

export async function exists(get: () => Promise<unknown>): Promise<boolean> {
  return (await find(get)) !== null;
}

/** Runs a script and prints Appwrite errors as one line instead of the raw response. */
export async function run(script: () => Promise<void>) {
  try {
    await script();
  } catch (err) {
    if (err instanceof AppwriteException)
      console.error(`Appwrite error ${err.code} ${err.type}: ${err.message}`);
    else console.error(err);
    process.exit(1);
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is missing. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
  return value;
}
