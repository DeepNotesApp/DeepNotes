import { describe, expect, it } from "vitest";

import { canChangeRole, canManageRole, roleHasManageLowerRanks } from "./group-role-policy";

describe("group-role-policy", () => {
  it("owner can manage lower ranks", () => {
    expect(canManageRole("owner", "member")).toBe(true);
    expect(canManageRole("owner", "owner")).toBe(true);
  });

  it("moderator can manage member but not admin", () => {
    expect(canManageRole("moderator", "member")).toBe(true);
    expect(canManageRole("moderator", "admin")).toBe(false);
  });

  it("canChangeRole requires both transitions", () => {
    expect(canChangeRole("owner", "member", "viewer")).toBe(true);
    expect(canChangeRole("moderator", "admin", "member")).toBe(false);
  });

  it("roleHasManageLowerRanks", () => {
    expect(roleHasManageLowerRanks("moderator")).toBe(true);
    expect(roleHasManageLowerRanks("member")).toBe(false);
  });
});
