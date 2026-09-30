import { useSuspenseQuery, queryOptions } from '@tanstack/react-query';
import { AppwriteException, Query, type Models } from 'appwrite';
import { account, teams } from './appwrite';
import type { UserPrefs } from './types';

export type TeamId = 'workspace' | 'sales' | 'success' | 'leadership';

export type Membership = {
  team: Models.Team;
  /** The user's roles in this team, such as "manager". */
  roles: string[];
};

export type Session = {
  user: Models.User<UserPrefs>;
  memberships: Membership[];
  /**
   * Every role the user holds, in permission syntax: user:<id>, team:<id>,
   * and team:<id>/<role>. Used to show which records the user can change.
   */
  roles: ReadonlySet<string>;
};

/** Loads the signed-in user, their teams, and their own role in each team. */
export async function fetchSession(): Promise<Session> {
  const user = await account.get<UserPrefs>();
  const { teams: list } = await teams.list();
  const memberships = await Promise.all(
    list.map(async (team) => {
      const { memberships: own } = await teams.listMemberships({
        teamId: team.$id,
        queries: [Query.equal('userId', user.$id)],
      });
      return { team, roles: own[0]?.roles ?? [] };
    }),
  );

  const roles = new Set(['any', 'users', `user:${user.$id}`]);
  for (const { team, roles: teamRoles } of memberships) {
    roles.add(`team:${team.$id}`);
    for (const role of teamRoles) roles.add(`team:${team.$id}/${role}`);
  }
  return { user, memberships, roles };
}

export const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: fetchSession,
  staleTime: 5 * 60_000,
  retry: false,
});

/** The session of the signed-in user. Only use inside the signed-in layout. */
export function useSession() {
  const { data } = useSuspenseQuery(sessionQuery);
  return data;
}

export function inTeam(session: Session, teamId: TeamId) {
  return session.roles.has(`team:${teamId}`);
}

export function workspaceName(session: Session) {
  return session.memberships.find(({ team }) => team.$id === 'workspace')?.team.name ?? 'Cairn';
}

/**
 * A local hint that this browser signed in before. Without it, the app goes
 * straight to the sign-in page instead of asking Appwrite for a session
 * that does not exist.
 */
const SESSION_HINT = 'cairn:signed-in';
export const sessionHint = {
  exists: () => localStorage.getItem(SESSION_HINT) === 'true',
  set: () => localStorage.setItem(SESSION_HINT, 'true'),
  clear: () => localStorage.removeItem(SESSION_HINT),
};

/** True when Appwrite rejected the request because nobody is signed in. */
export function isSignedOutError(err: unknown) {
  return (
    err instanceof AppwriteException &&
    err.code === 401 &&
    (err.type === 'general_unauthorized_scope' || err.type === 'user_jwt_invalid')
  );
}
