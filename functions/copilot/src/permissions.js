import { Permission, Role } from 'node-appwrite';

/**
 * Row permissions for a note. The visibility decides who can read it; only
 * the author can change or delete it.
 */
export function notePermissions(visibility, userId) {
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
export function visibilityOf(row) {
  if (row.$permissions.includes('read("team:leadership")')) return 'leadership';
  if (row.$permissions.includes('read("team:workspace")')) return 'workspace';
  return 'private';
}
