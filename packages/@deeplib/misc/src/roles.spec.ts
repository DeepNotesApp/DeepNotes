import { describe, expect, it } from 'vitest';

import { canChangeRole, canManageRole } from './roles';

describe('canManageRoles', () => {
  it('should return true if the manager can manage the target.', () => {
    expect(canManageRole('owner', 'owner')).toBe(true);
    expect(canManageRole('owner', 'admin')).toBe(true);
    expect(canManageRole('owner', 'moderator')).toBe(true);
    expect(canManageRole('owner', 'member')).toBe(true);
    expect(canManageRole('owner', 'viewer')).toBe(true);
    expect(canManageRole('owner', 'asd' as any)).toBe(false);
    expect(canManageRole('owner', null as any)).toBe(false);

    expect(canManageRole('admin', 'owner')).toBe(false);
    expect(canManageRole('admin', 'admin')).toBe(true);
    expect(canManageRole('admin', 'moderator')).toBe(true);
    expect(canManageRole('admin', 'member')).toBe(true);
    expect(canManageRole('admin', 'viewer')).toBe(true);
    expect(canManageRole('admin', 'asd' as any)).toBe(false);
    expect(canManageRole('admin', null as any)).toBe(false);

    expect(canManageRole('moderator', 'owner')).toBe(false);
    expect(canManageRole('moderator', 'admin')).toBe(false);
    expect(canManageRole('moderator', 'moderator')).toBe(false);
    expect(canManageRole('moderator', 'member')).toBe(true);
    expect(canManageRole('moderator', 'viewer')).toBe(true);
    expect(canManageRole('moderator', 'asd' as any)).toBe(false);
    expect(canManageRole('moderator', null as any)).toBe(false);

    expect(canManageRole('member', 'owner')).toBe(false);
    expect(canManageRole('member', 'admin')).toBe(false);
    expect(canManageRole('member', 'moderator')).toBe(false);
    expect(canManageRole('member', 'member')).toBe(false);
    expect(canManageRole('member', 'viewer')).toBe(false);
    expect(canManageRole('member', 'asd' as any)).toBe(false);
    expect(canManageRole('member', null as any)).toBe(false);

    expect(canManageRole('viewer', 'owner')).toBe(false);
    expect(canManageRole('viewer', 'admin')).toBe(false);
    expect(canManageRole('viewer', 'moderator')).toBe(false);
    expect(canManageRole('viewer', 'member')).toBe(false);
    expect(canManageRole('viewer', 'viewer')).toBe(false);
    expect(canManageRole('viewer', 'asd' as any)).toBe(false);
    expect(canManageRole('viewer', null as any)).toBe(false);
  });
});

describe('canChangeRole', () => {
  it('should return true if manager can change the role of the target.', () => {
    expect(canChangeRole('owner', 'owner', 'owner')).toBe(true);
    expect(canChangeRole('owner', 'admin', 'owner')).toBe(true);
    expect(canChangeRole('owner', 'moderator', 'owner')).toBe(true);
    expect(canChangeRole('owner', 'member', 'owner')).toBe(true);
    expect(canChangeRole('owner', 'viewer', 'owner')).toBe(true);
    expect(canChangeRole('owner', 'asd' as any, 'owner')).toBe(false);
    expect(canChangeRole('owner', null as any, 'owner')).toBe(false);

    expect(canChangeRole('admin', 'owner', 'admin')).toBe(false);
    expect(canChangeRole('admin', 'admin', 'admin')).toBe(true);
    expect(canChangeRole('admin', 'moderator', 'admin')).toBe(true);
    expect(canChangeRole('admin', 'member', 'admin')).toBe(true);
    expect(canChangeRole('admin', 'viewer', 'admin')).toBe(true);
    expect(canChangeRole('admin', 'asd' as any, 'admin')).toBe(false);
    expect(canChangeRole('admin', null as any, 'admin')).toBe(false);

    expect(canChangeRole('moderator', 'owner', 'moderator')).toBe(false);
    expect(canChangeRole('moderator', 'admin', 'moderator')).toBe(false);
    expect(canChangeRole('moderator', 'moderator', 'moderator')).toBe(false);
    expect(canChangeRole('moderator', 'member', 'moderator')).toBe(false);
    expect(canChangeRole('moderator', 'viewer', 'moderator')).toBe(false);
    expect(canChangeRole('moderator', 'asd' as any, 'moderator')).toBe(false);
    expect(canChangeRole('moderator', null as any, 'moderator')).toBe(false);

    expect(canChangeRole('moderator', 'viewer', 'member')).toBe(true);
    expect(canChangeRole('moderator', 'member', 'viewer')).toBe(true);
  });
});
