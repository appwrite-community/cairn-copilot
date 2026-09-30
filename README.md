# Cairn: a CRM with a permission-aware AI copilot

Cairn is a small CRM for B2B sales and customer success teams. Its assistant, Scout, briefs you on an
account, logs notes and tasks, and moves deals forward. Scout runs in an Appwrite Function **as the
signed-in user**: the function builds its Appwrite client from the caller's JWT, so every search, read,
and update follows the same row permissions and teams as the user's own requests. The function has no
API key scopes at all.

The model is GPT-6 Luna through OpenRouter.

## How it works

1. The web app signs users in with email and password.
2. Scout starts with an asynchronous execution of the `copilot` function. The request body holds the
   thread ID, the prompt, and the user's time zone.
3. Appwrite sends the caller's JWT to the function in the `x-appwrite-user-jwt` header. The function
   creates a `node-appwrite` client with `setJWT` and uses only that client.
4. The function records the run (row ID = execution ID) and one step per tool call as the user. The web
   app follows them through Realtime.
5. A row the user cannot read looks the same as a row that does not exist. A change the user is not
   allowed to make fails, and Scout says so.

No function reacts to events or schedules.

## Layout

- `functions/copilot/src/main.js`: entry point. Checks the input, claims the run, and runs Scout.
- `functions/copilot/src/appwrite.js`: the client that acts as the caller (`userClient`).
- `functions/copilot/src/tools.js`: Scout's tools (search, list, read, create, update rows).
- `functions/copilot/src/agent.js`: the OpenRouter tool loop.
- `functions/copilot/src/errors.js`: turns Appwrite errors into results the model can use.
- `functions/copilot/src/run-log.js`: run and step rows, written as the user.
- `functions/copilot/src/prompt.js`: the system prompt. It holds no permission rules.
- `functions/copilot/src/permissions.js`: note permissions and visibility.
- `scripts/schema.ts`: the database, tables, columns, indexes, and teams.
- `scripts/provision.ts`: creates everything in `schema.ts`. Safe to run again.
- `scripts/seed.ts`: creates the demo users, their team roles, and the CRM rows with row permissions.
- `apps/web`: the Cairn web app (Vite, React, TypeScript).
- `appwrite.config.json`: the `copilot` function for `appwrite push functions`.

## Setup

You need Node.js 22 or later, pnpm, the [Appwrite CLI](https://appwrite.io/docs/tooling/command-line/installation),
an Appwrite project, and an [OpenRouter](https://openrouter.ai) API key.

1. Install the dependencies:

   ```bash
   pnpm install
   ```

2. In the Appwrite Console, add a **Web** platform for `localhost` to your project. Then create an API key
   with these scopes: `databases.read`, `databases.write`, `tables.read`, `tables.write`, `columns.read`,
   `columns.write`, `indexes.read`, `indexes.write`, `rows.read`, `rows.write`, `teams.read`,
   `teams.write`, `users.read`, `users.write`. Only the setup scripts use this key.
3. Copy `.env.example` to `.env` and fill in the endpoint, project ID, API key, and a `DEMO_PASSWORD` for
   the demo users (at least 8 characters). The seed script uses the password only when it creates a user.
4. Create the database, tables, and teams, then add the demo data:

   ```bash
   pnpm provision
   pnpm seed
   ```

   Both scripts are safe to run again. `pnpm seed` resets the seeded rows and moves their dates
   relative to today.

5. Set `projectId` and `endpoint` in `appwrite.config.json`, then deploy the function:

   ```bash
   appwrite push functions
   ```

6. In the Console, open the `copilot` function, add these variables on the **Variables** tab, and redeploy:

   | Variable             | Value                                    |
   | -------------------- | ---------------------------------------- |
   | `OPENROUTER_API_KEY` | Your OpenRouter API key (mark it secret) |
   | `OPENROUTER_MODEL`   | Optional, default `openai/gpt-6-luna`    |

7. Start the web app and sign in as one of the demo users:

   ```bash
   pnpm dev
   ```

`VITE_DEMO_PASSWORD` in `.env` is optional. When it is set, the sign-in page signs in a demo user with one
click. Do not set it on a public deployment.

## Demo users

| User                                  | Email                       | Teams (roles)                                   |
| ------------------------------------- | --------------------------- | ----------------------------------------------- |
| Maya Chen, Account Executive          | `maya.chen@example.com`     | Lumina Analytics, Sales (`rep`)                 |
| Daniel Okafor, Head of Sales          | `daniel.okafor@example.com` | Lumina Analytics, Sales (`manager`), Leadership |
| Priya Raman, Customer Success Manager | `priya.raman@example.com`   | Lumina Analytics, Customer Success              |
| Tom Becker, Account Executive         | `tom.becker@example.com`    | Lumina Analytics, Sales (`rep`)                 |

## How permissions decide what Scout can reach

All tables use row security. The seed script gives each row its own permissions:

- Accounts and contacts: everyone in the `workspace` team (Lumina Analytics) reads them. The owner and
  sales managers update accounts.
- Deals: only the `sales` team reads them. Only the owner and sales managers update them.
- Notes: shared with the workspace, private to the author, or shared with `leadership`. Only the author
  updates or deletes a note.
- Tasks, threads, runs, and steps: only the user who created them.
- Halcyon Health, its contact, and its deal: only `leadership` reads them.

The same question gets different answers for different users. Ask "What pricing flexibility do we have
on Alder Freight?" as Maya and as Daniel: only Daniel's Scout can read the Leadership note with the
approved discount. Priya's Scout finds no deals at all, and Maya's Scout cannot move Tom's deal.

The `copilot` function has no scopes, so the per-execution API key that Appwrite gives every function
cannot read anything. An API key would skip row permissions, and the prompt would then be the only thing
between the model and every row in the project. Execution is limited to the `workspace` team.

## License

MIT
