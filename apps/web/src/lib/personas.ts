/**
 * The demo users that `pnpm seed` creates. The sign-in page lists them so you
 * can switch between people with different access.
 */
export const PERSONAS = [
  {
    name: 'Maya Chen',
    email: 'maya.chen@example.com',
    title: 'Account Executive',
    teams: ['Sales'],
  },
  {
    name: 'Daniel Okafor',
    email: 'daniel.okafor@example.com',
    title: 'Head of Sales',
    teams: ['Sales', 'Leadership'],
  },
  {
    name: 'Priya Raman',
    email: 'priya.raman@example.com',
    title: 'Customer Success Manager',
    teams: ['Customer Success'],
  },
  {
    name: 'Tom Becker',
    email: 'tom.becker@example.com',
    title: 'Account Executive',
    teams: ['Sales'],
  },
] as const;
