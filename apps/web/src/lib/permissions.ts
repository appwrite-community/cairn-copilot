import { Permission, Role, type Models } from 'appwrite';

export type Visibility = 'workspace' | 'private' | 'leadership';

/**
 * Row permissions for a note. The visibility decides who can read it; only
 * the author can change or delete it. The copilot function uses the same rules.
 */
export function notePermissions(visibility: Visibility, userId: string) {
  const reader = {
    workspace: Role.team('workspace'),
    private: Role.user(userId),
    leadership: Role.team('leadership'),
  }[visibility];

  return [
    Permission.read(reader),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];
}

/** Reads a note's visibility back from its permissions. */
export function visibilityOf(row: Models.Row): Visibility {
  if (row.$permissions.includes('read("team:leadership")')) return 'leadership';
  if (row.$permissions.includes('read("team:workspace")')) return 'workspace';
  return 'private';
}

/** A record only Leadership can read, such as a confidential account. */
export function isConfidential(row: Models.Row) {
  return visibilityOf(row) === 'leadership';
}

/**
 * Whether one of the user's roles has update permission on the row. The UI
 * uses this to disable controls; Appwrite enforces the same rule on write.
 */
export function canUpdate(row: Models.Row, roles: ReadonlySet<string>) {
  return row.$permissions.some((permission) => {
    const match = /^(?:update|write)\("(.+)"\)$/.exec(permission);
    return match !== null && roles.has(match[1]);
  });
}
