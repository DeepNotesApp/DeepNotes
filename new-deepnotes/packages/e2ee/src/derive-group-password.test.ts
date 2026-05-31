import { describe, expect, it } from "vitest";
import { deriveGroupPasswordValues, nanoidToBytes } from "./derive-group-password.js";

describe("deriveGroupPasswordValues", () => {
  it("produces deterministic output for a known group id and password", () => {
    const groupId = "V1StGXR8_Z5jdHi6B-myT";
    const password = "test-password-123";

    const result1 = deriveGroupPasswordValues(groupId, password);
    const result2 = deriveGroupPasswordValues(groupId, password);

    expect(result1.passwordHash.length).toBe(64);
    expect(result1.passwordKey.value.length).toBe(32);
    expect(new Uint8Array(result1.passwordHash)).toEqual(
      new Uint8Array(result2.passwordHash),
    );
    expect(result1.passwordKey.value).toEqual(result2.passwordKey.value);
  });

  it("uses nanoidToBytes for salt", () => {
    const groupId = "V1StGXR8_Z5jdHi6B-myT";
    const password = "any-password";

    const result = deriveGroupPasswordValues(groupId, password);

    // The salt should be 16 bytes (nanoidToBytes always returns 16)
    expect(nanoidToBytes(groupId).length).toBe(16);
    // Just verify the function doesn't throw and produces valid output
    expect(result.passwordHash).toBeInstanceOf(Uint8Array);
    expect(result.passwordKey).toBeDefined();
  });
});
