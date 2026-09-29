import { Permission, Query, Role, TablesDB, Teams, Users } from 'node-appwrite';
import { client, find, requireEnv, run } from './client.ts';
import { DATABASE_ID, type TeamId } from './schema.ts';

/**
 * Seeds the Lumina Analytics workspace: four users with their team roles, and
 * accounts, contacts, deals, notes, and tasks with per-row permissions. Rows
 * have fixed IDs, so running the script again resets them instead of adding
 * duplicates. Dates are relative to the day you run it.
 */

const password = requireEnv('DEMO_PASSWORD');
if (password.length < 8) {
  console.error('DEMO_PASSWORD must be at least 8 characters.');
  process.exit(1);
}

const tablesDB = new TablesDB(client);
const users = new Users(client);
const teams = new Teams(client);

// ---------------------------------------------------------------------------
// People and teams
// ---------------------------------------------------------------------------

type Person = {
  userId: string;
  name: string;
  email: string;
  title: string;
  roles: Partial<Record<TeamId, string[]>>;
};

const PEOPLE: Person[] = [
  {
    userId: 'maya-chen',
    name: 'Maya Chen',
    email: 'maya.chen@example.com',
    title: 'Account Executive',
    roles: { workspace: ['member'], sales: ['rep'] },
  },
  {
    userId: 'daniel-okafor',
    name: 'Daniel Okafor',
    email: 'daniel.okafor@example.com',
    title: 'Head of Sales',
    roles: { workspace: ['member'], sales: ['manager'], leadership: ['member'] },
  },
  {
    userId: 'priya-raman',
    name: 'Priya Raman',
    email: 'priya.raman@example.com',
    title: 'Customer Success Manager',
    roles: { workspace: ['member'], success: ['member'] },
  },
  {
    userId: 'tom-becker',
    name: 'Tom Becker',
    email: 'tom.becker@example.com',
    title: 'Account Executive',
    roles: { workspace: ['member'], sales: ['rep'] },
  },
];

const person = (userId: string) => PEOPLE.find((p) => p.userId === userId)!;

// ---------------------------------------------------------------------------
// Dates: date-only values are stored at 12:00 UTC, see README
// ---------------------------------------------------------------------------

const today = new Date();
today.setUTCHours(0, 0, 0, 0);

function daysFromToday(days: number, hour = 12, minute = 0) {
  const date = new Date(today);
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, minute, 0, 0);
  return date.toISOString();
}

const monthDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

const workspace = Role.team('workspace');
const leadership = Role.team('leadership');
const salesManagers = Role.team('sales', 'manager');

/** Everyone in the workspace reads it; the owner and sales managers update it. */
function sharedRecord(ownerId: string, readers = workspace) {
  return [
    Permission.read(readers),
    Permission.update(Role.user(ownerId)),
    Permission.update(salesManagers),
  ];
}

/** Confidential records: only Leadership reads them, only the owner updates them. */
function confidentialRecord(ownerId: string) {
  return [Permission.read(leadership), Permission.update(Role.user(ownerId))];
}

type Visibility = 'workspace' | 'private' | 'leadership';

function notePermissions(visibility: Visibility, authorId: string) {
  const reader = { workspace, private: Role.user(authorId), leadership }[visibility];
  return [
    Permission.read(reader),
    Permission.update(Role.user(authorId)),
    Permission.delete(Role.user(authorId)),
  ];
}

function ownerOnly(userId: string) {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];
}

// ---------------------------------------------------------------------------
// Accounts, contacts, deals
// ---------------------------------------------------------------------------

type Account = {
  id: string;
  name: string;
  domain: string;
  industry: string;
  segment: 'enterprise' | 'mid_market' | 'smb';
  lifecycle: 'customer' | 'prospect';
  health: 'healthy' | 'watch' | 'at_risk';
  arr: number;
  renewalInDays: number | null;
  ownerId: string;
  summary: string;
  contacts: [name: string, title: string][];
  confidential?: boolean;
};

const ACCOUNTS: Account[] = [
  {
    id: 'alder-freight',
    name: 'Alder Freight',
    domain: 'alderfreight.example',
    industry: 'Logistics',
    segment: 'mid_market',
    lifecycle: 'customer',
    health: 'watch',
    arr: 72000,
    renewalInDays: 62,
    ownerId: 'maya-chen',
    summary: 'Regional freight carrier running 420 trucks out of Denver.',
    contacts: [
      ['Ana Ruiz', 'CFO'],
      ['Marcus Lee', 'VP Operations'],
      ['Jen Park', 'IT Director'],
    ],
  },
  {
    id: 'kestrel-biotech',
    name: 'Kestrel Biotech',
    domain: 'kestrelbio.example',
    industry: 'Life sciences',
    segment: 'enterprise',
    lifecycle: 'customer',
    health: 'healthy',
    arr: 164000,
    renewalInDays: 168,
    ownerId: 'tom-becker',
    summary: 'Contract research lab with sites in Boston and Basel.',
    contacts: [
      ['Lena Vogel', 'Head of Lab Operations'],
      ['Sam Okoro', 'Procurement Manager'],
    ],
  },
  {
    id: 'harbor-pine',
    name: 'Harbor & Pine Outfitters',
    domain: 'harborpine.example',
    industry: 'Retail',
    segment: 'mid_market',
    lifecycle: 'customer',
    health: 'healthy',
    arr: 48000,
    renewalInDays: 120,
    ownerId: 'maya-chen',
    summary: 'Outdoor retailer with 38 stores and a fast-growing online shop.',
    contacts: [
      ['Ellie Brandt', 'Director of Merchandising'],
      ['Ravi Menon', 'E-commerce Lead'],
    ],
  },
  {
    id: 'meridian-health',
    name: 'Meridian Health Partners',
    domain: 'meridianhp.example',
    industry: 'Healthcare',
    segment: 'enterprise',
    lifecycle: 'customer',
    health: 'at_risk',
    arr: 210000,
    renewalInDays: 11,
    ownerId: 'tom-becker',
    summary: 'Hospital network with 14 facilities across Ohio.',
    contacts: [
      ['Karen Walsh', 'CIO'],
      ['Diego Alvarez', 'Director of Clinical Operations'],
    ],
  },
  {
    id: 'quarry-street',
    name: 'Quarry Street Bakeries',
    domain: 'quarrystreet.example',
    industry: 'Food and beverage',
    segment: 'smb',
    lifecycle: 'customer',
    health: 'healthy',
    arr: 18000,
    renewalInDays: 205,
    ownerId: 'maya-chen',
    summary: 'Wholesale bakery supplying 300 cafes in the Pacific Northwest.',
    contacts: [['Nora Quinn', 'Owner']],
  },
  {
    id: 'tidewater-ports',
    name: 'Tidewater Ports Authority',
    domain: 'tidewaterports.example',
    industry: 'Public sector',
    segment: 'enterprise',
    lifecycle: 'prospect',
    health: 'watch',
    arr: 0,
    renewalInDays: null,
    ownerId: 'tom-becker',
    summary: 'Port authority evaluating fleet analytics for 900 yard vehicles.',
    contacts: [
      ['Raymond Holt', 'Fleet Operations Manager'],
      ['Grace Kim', 'Procurement Officer'],
    ],
  },
  {
    id: 'bluefin-robotics',
    name: 'Bluefin Robotics',
    domain: 'bluefinrobotics.example',
    industry: 'Manufacturing',
    segment: 'mid_market',
    lifecycle: 'customer',
    health: 'healthy',
    arr: 64000,
    renewalInDays: 354,
    ownerId: 'maya-chen',
    summary: 'Warehouse robotics maker with a plant in Monterrey.',
    contacts: [
      ['Omar Haddad', 'COO'],
      ['Mia Torres', 'Plant Manager'],
    ],
  },
  {
    id: 'orchard-lane',
    name: 'Orchard Lane Schools',
    domain: 'orchardlane.example',
    industry: 'Education',
    segment: 'smb',
    lifecycle: 'customer',
    health: 'at_risk',
    arr: 22000,
    renewalInDays: 24,
    ownerId: 'tom-becker',
    summary: 'Charter school group with nine campuses and a shared bus fleet.',
    contacts: [['Beth Carter', 'Director of Operations']],
  },
  {
    id: 'sable-grid',
    name: 'Sable Grid Energy',
    domain: 'sablegrid.example',
    industry: 'Energy',
    segment: 'enterprise',
    lifecycle: 'prospect',
    health: 'healthy',
    arr: 0,
    renewalInDays: null,
    ownerId: 'maya-chen',
    summary: 'Utility-scale solar operator planning a field service overhaul.',
    contacts: [
      ['Victor Lindqvist', 'VP Field Services'],
      ['Aisha Bello', 'Data Platform Lead'],
    ],
  },
  {
    id: 'halcyon-health',
    name: 'Halcyon Health',
    domain: 'halcyonhealth.example',
    industry: 'Healthcare',
    segment: 'enterprise',
    lifecycle: 'prospect',
    health: 'healthy',
    arr: 0,
    renewalInDays: null,
    ownerId: 'daniel-okafor',
    summary: 'Health system in confidential talks about a multi-year platform agreement.',
    contacts: [['Miriam Cole', 'Chief Operating Officer']],
    confidential: true,
  },
];

const account = (id: string) => ACCOUNTS.find((a) => a.id === id)!;

type Deal = {
  id: string;
  accountId: string;
  name: string;
  amount: number;
  stage: 'discovery' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  closeInDays: number;
  ownerId: string;
  nextStep: string | null;
};

const DEALS: Deal[] = [
  {
    id: 'alder-renewal',
    accountId: 'alder-freight',
    name: 'Two-year renewal with Fleet module',
    amount: 86400,
    stage: 'proposal',
    closeInDays: 31,
    ownerId: 'maya-chen',
    nextStep: 'Send revised two-year quote to Ana Ruiz',
  },
  {
    id: 'kestrel-expansion',
    accountId: 'kestrel-biotech',
    name: 'Analytics expansion, 120 seats',
    amount: 142000,
    stage: 'negotiation',
    closeInDays: 17,
    ownerId: 'tom-becker',
    nextStep: 'Legal review of the data processing addendum',
  },
  {
    id: 'harbor-pine-forecasting',
    accountId: 'harbor-pine',
    name: 'Forecasting add-on',
    amount: 19200,
    stage: 'discovery',
    closeInDays: 52,
    ownerId: 'maya-chen',
    nextStep: 'Scope a pilot for the 8 highest-volume stores',
  },
  {
    id: 'meridian-renewal',
    accountId: 'meridian-health',
    name: 'Enterprise renewal',
    amount: 210000,
    stage: 'negotiation',
    closeInDays: 10,
    ownerId: 'tom-becker',
    nextStep: 'Executive call with Karen Walsh about SSO issues',
  },
  {
    id: 'quarry-street-routes',
    accountId: 'quarry-street',
    name: 'Six new delivery routes',
    amount: 9600,
    stage: 'proposal',
    closeInDays: 24,
    ownerId: 'maya-chen',
    nextStep: 'Confirm the route count with Nora Quinn',
  },
  {
    id: 'tidewater-pilot',
    accountId: 'tidewater-ports',
    name: 'Fleet module pilot',
    amount: 58000,
    stage: 'discovery',
    closeInDays: 73,
    ownerId: 'tom-becker',
    nextStep: 'Security questionnaire due from procurement',
  },
  {
    id: 'bluefin-renewal',
    accountId: 'bluefin-robotics',
    name: 'Annual renewal',
    amount: 64000,
    stage: 'closed_won',
    closeInDays: -11,
    ownerId: 'maya-chen',
    nextStep: null,
  },
  {
    id: 'sable-grid-platform',
    accountId: 'sable-grid',
    name: 'Platform and Fleet module',
    amount: 186000,
    stage: 'discovery',
    closeInDays: 122,
    ownerId: 'maya-chen',
    nextStep: 'Technical deep dive with Aisha Bello',
  },
  {
    id: 'orchard-lane-renewal',
    accountId: 'orchard-lane',
    name: 'Renewal, bus fleet package',
    amount: 22000,
    stage: 'proposal',
    closeInDays: 24,
    ownerId: 'tom-becker',
    nextStep: 'Offer a smaller package focused on the bus fleet',
  },
  {
    id: 'halcyon-platform',
    accountId: 'halcyon-health',
    name: 'Multi-year platform agreement',
    amount: 480000,
    stage: 'negotiation',
    closeInDays: 80,
    ownerId: 'daniel-okafor',
    nextStep: 'Board approval expected after the November meeting',
  },
];

// ---------------------------------------------------------------------------
// Notes and tasks
// ---------------------------------------------------------------------------

type Note = [
  accountId: string,
  authorId: string,
  kind: 'call' | 'meeting' | 'email' | 'internal',
  visibility: Visibility,
  daysAgo: number,
  body: string,
];

const alderClose = monthDay(
  daysFromToday(DEALS.find((d) => d.id === 'alder-renewal')!.closeInDays),
);

const NOTES: Note[] = [
  [
    'alder-freight',
    'maya-chen',
    'call',
    'workspace',
    9,
    'Discovery call with Marcus Lee. They are consolidating three dispatch tools and want the Fleet module live before peak season in November.',
  ],
  [
    'alder-freight',
    'priya-raman',
    'meeting',
    'workspace',
    14,
    'Quarterly review with Marcus and Jen. Adoption is at 78 percent of seats. Two SSO login loop tickets this quarter, both resolved.',
  ],
  [
    'alder-freight',
    'tom-becker',
    'email',
    'workspace',
    21,
    'Jen Park asked for our SOC 2 report. Sent it through the trust portal.',
  ],
  [
    'alder-freight',
    'maya-chen',
    'internal',
    'private',
    3,
    'Ana prefers email over calls. She owns the renewal budget and pushes back on any increase above 8 percent.',
  ],
  [
    'alder-freight',
    'daniel-okafor',
    'internal',
    'leadership',
    2,
    `Approved up to 12 percent off list for a signed two-year term before ${alderClose}. Do not share the floor price with the customer.`,
  ],
  [
    'alder-freight',
    'daniel-okafor',
    'internal',
    'private',
    6,
    'Alder could be our logistics case study if the Fleet rollout lands before peak season.',
  ],
  [
    'alder-freight',
    'maya-chen',
    'meeting',
    'workspace',
    1,
    "Demoed the Fleet dashboards to Marcus's dispatch leads. They asked for route-level fuel reports, which ship in the October release.",
  ],
  [
    'kestrel-biotech',
    'tom-becker',
    'call',
    'workspace',
    5,
    'Lena confirmed budget for 120 more seats. Procurement wants a data processing addendum before signature.',
  ],
  [
    'kestrel-biotech',
    'priya-raman',
    'meeting',
    'workspace',
    30,
    'Onboarded the Basel site. Lab managers use the daily throughput dashboard most.',
  ],
  [
    'kestrel-biotech',
    'tom-becker',
    'internal',
    'private',
    4,
    'Sam Okoro hinted that a competitor quoted 15 percent lower. Need a value summary before the next call.',
  ],
  [
    'harbor-pine',
    'maya-chen',
    'call',
    'workspace',
    12,
    'Ellie wants demand forecasts per store before the holiday season. Pilot with the 8 busiest stores.',
  ],
  [
    'harbor-pine',
    'priya-raman',
    'email',
    'workspace',
    8,
    'Ravi reported slow CSV exports for the online channel. Opened a ticket with support.',
  ],
  [
    'meridian-health',
    'priya-raman',
    'meeting',
    'workspace',
    4,
    'Escalation call. SSO outages hit two facilities last week. Karen Walsh expects a remediation plan by Friday.',
  ],
  [
    'meridian-health',
    'tom-becker',
    'internal',
    'workspace',
    3,
    'The renewal is at risk until the SSO fix ships. Proposed an executive call with Karen.',
  ],
  [
    'meridian-health',
    'daniel-okafor',
    'internal',
    'leadership',
    2,
    'If Meridian asks for a concession, offer three months of the SSO add-on at no cost. No change to list price.',
  ],
  [
    'meridian-health',
    'priya-raman',
    'internal',
    'workspace',
    1,
    'Engineering confirmed the SSO fix ships Thursday. Will share release notes with Diego.',
  ],
  [
    'quarry-street',
    'maya-chen',
    'call',
    'workspace',
    6,
    'Nora is adding six delivery routes in November and wants route profitability views for each.',
  ],
  [
    'quarry-street',
    'priya-raman',
    'email',
    'workspace',
    20,
    'Sent Nora the onboarding checklist for the new route managers.',
  ],
  [
    'tidewater-ports',
    'tom-becker',
    'meeting',
    'workspace',
    10,
    'Site visit with Raymond Holt. 900 yard vehicles, and idle time is their biggest cost.',
  ],
  [
    'tidewater-ports',
    'tom-becker',
    'email',
    'workspace',
    2,
    'Grace Kim sent the security questionnaire. Due in two weeks.',
  ],
  [
    'bluefin-robotics',
    'maya-chen',
    'internal',
    'workspace',
    11,
    'Renewal signed for another year at 64,000. Omar wants a plant utilization review in Q1.',
  ],
  [
    'bluefin-robotics',
    'priya-raman',
    'meeting',
    'workspace',
    7,
    'Year-two kickoff with Mia Torres. Adding shift-level dashboards.',
  ],
  [
    'orchard-lane',
    'priya-raman',
    'call',
    'workspace',
    5,
    'Beth says the bus fleet dashboard is underused. Budget cuts are likely next year.',
  ],
  [
    'orchard-lane',
    'tom-becker',
    'internal',
    'workspace',
    3,
    'Considering a smaller package focused on the bus fleet to save the renewal.',
  ],
  [
    'sable-grid',
    'maya-chen',
    'meeting',
    'workspace',
    4,
    'Intro with Victor Lindqvist. 60 field crews on paper work orders. Interested in Fleet plus Forecasting.',
  ],
  [
    'sable-grid',
    'maya-chen',
    'internal',
    'private',
    4,
    'Victor mentioned their current vendor contract ends in March. Timeline matters more than price.',
  ],
  [
    'halcyon-health',
    'daniel-okafor',
    'meeting',
    'leadership',
    8,
    'Second meeting with Miriam Cole. They want a five-year agreement covering 22 hospitals.',
  ],
];

type Task = [
  ownerId: string,
  title: string,
  accountId: string | null,
  dueInDays: number,
  done?: boolean,
];

const TASKS: Task[] = [
  ['maya-chen', 'Send revised two-year quote to Ana Ruiz', 'alder-freight', 2],
  ['maya-chen', 'Share the route-level fuel report preview with Marcus Lee', 'alder-freight', 5],
  ['maya-chen', 'Scope Forecasting pilot stores with Ellie Brandt', 'harbor-pine', 0],
  ['maya-chen', 'Book a technical deep dive with Aisha Bello', 'sable-grid', -1],
  ['maya-chen', 'Confirm the new route count with Nora Quinn', 'quarry-street', 7],
  ['maya-chen', 'File the Bluefin renewal paperwork', 'bluefin-robotics', -9, true],
  ['daniel-okafor', 'Review the Q4 forecast with the sales team', null, 1],
  ['daniel-okafor', 'Prepare a board summary for Halcyon Health', 'halcyon-health', 9],
  ['daniel-okafor', 'Decide on a Meridian concession if requested', 'meridian-health', 3],
  ['priya-raman', 'Share SSO release notes with Diego Alvarez', 'meridian-health', 2],
  ['priya-raman', 'Adoption review with Beth Carter', 'orchard-lane', 6],
  ['priya-raman', 'Follow up on the CSV export ticket for Ravi Menon', 'harbor-pine', 0],
  ['tom-becker', 'Send a value summary to Sam Okoro', 'kestrel-biotech', 1],
  ['tom-becker', 'Complete the Tidewater security questionnaire', 'tidewater-ports', 12],
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

await run(async () => {
  for (const p of PEOPLE) await ensureUser(p);
  for (const p of PEOPLE) await ensureMemberships(p);

  for (const a of ACCOUNTS) {
    await upsert(
      'accounts',
      a.id,
      {
        name: a.name,
        domain: a.domain,
        industry: a.industry,
        segment: a.segment,
        lifecycle: a.lifecycle,
        health: a.health,
        arr: a.arr,
        renewalDate: a.renewalInDays === null ? null : daysFromToday(a.renewalInDays),
        ownerId: a.ownerId,
        ownerName: person(a.ownerId).name,
        summary: a.summary,
      },
      a.confidential ? confidentialRecord(a.ownerId) : sharedRecord(a.ownerId),
    );

    for (const [position, [name, title]] of a.contacts.entries()) {
      const [first, last] = name.toLowerCase().split(' ');
      await upsert(
        'contacts',
        `${first}-${last}`,
        {
          accountId: a.id,
          accountName: a.name,
          name,
          title,
          email: `${first}.${last}@${a.domain}`,
          isPrimary: position === 0,
        },
        [Permission.read(a.confidential ? leadership : workspace)],
      );
    }
  }
  console.log(`Seeded ${ACCOUNTS.length} accounts and their contacts`);

  for (const d of DEALS) {
    const a = account(d.accountId);
    await upsert(
      'deals',
      d.id,
      {
        accountId: d.accountId,
        accountName: a.name,
        name: d.name,
        amount: d.amount,
        stage: d.stage,
        closeDate: daysFromToday(d.closeInDays),
        ownerId: d.ownerId,
        ownerName: person(d.ownerId).name,
        nextStep: d.nextStep,
        updatedByName: null,
        updatedVia: 'app',
      },
      a.confidential ? confidentialRecord(d.ownerId) : sharedRecord(d.ownerId, Role.team('sales')),
    );
  }
  console.log(`Seeded ${DEALS.length} deals`);

  for (const [i, [accountId, authorId, kind, visibility, daysAgo, body]] of NOTES.entries()) {
    // Timestamps are set explicitly so the notes read like a real history.
    const createdAt = daysFromToday(-daysAgo, 16, -i * 7);
    await upsert(
      'notes',
      `note-${String(i + 1).padStart(2, '0')}`,
      {
        accountId,
        accountName: account(accountId).name,
        body,
        kind,
        authorId,
        authorName: person(authorId).name,
        source: 'app',
        $createdAt: createdAt,
        $updatedAt: createdAt,
      },
      notePermissions(visibility, authorId),
    );
  }
  console.log(`Seeded ${NOTES.length} notes`);

  for (const [i, [ownerId, title, accountId, dueInDays, done = false]] of TASKS.entries()) {
    await upsert(
      'tasks',
      `task-${String(i + 1).padStart(2, '0')}`,
      {
        title,
        dueDate: daysFromToday(dueInDays),
        done,
        accountId,
        accountName: accountId ? account(accountId).name : null,
        source: 'app',
      },
      ownerOnly(ownerId),
    );
  }
  console.log(`Seeded ${TASKS.length} tasks`);
  console.log('Seeding finished.');
});

async function ensureUser({ userId, name, email, title }: Person) {
  const user = await find(() => users.get({ userId }));
  if (!user) {
    await users.create({ userId, email, password, name });
    console.log(`Created user ${email}`);
  } else {
    // Existing users keep their password: changing it would sign them out everywhere.
    if (user.name !== name) await users.updateName({ userId, name });
    console.log(`User ${email} exists`);
  }
  await users.updatePrefs({ userId, prefs: { title } });
}

async function ensureMemberships({ userId, name, roles }: Person) {
  for (const [teamId, teamRoles] of Object.entries(roles)) {
    const { memberships } = await teams.listMemberships({
      teamId,
      queries: [Query.equal('userId', userId)],
    });
    const membership = memberships[0];
    if (!membership) {
      // With an API key, the membership is confirmed at once and no invitation email is sent.
      await teams.createMembership({ teamId, userId, roles: teamRoles });
      console.log(`Added ${name} to ${teamId} as ${teamRoles.join(', ')}`);
    } else if (membership.roles.join() !== teamRoles.join()) {
      await teams.updateMembership({ teamId, membershipId: membership.$id, roles: teamRoles });
      console.log(`Updated ${name}'s roles in ${teamId}`);
    }
  }
}

function upsert(
  tableId: string,
  rowId: string,
  data: Record<string, unknown>,
  permissions: string[],
) {
  return tablesDB.upsertRow({ databaseId: DATABASE_ID, tableId, rowId, data, permissions });
}
