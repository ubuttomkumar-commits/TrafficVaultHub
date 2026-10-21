import { describe, it, expect } from "vitest";
import { PLATFORM_OPS_ROLE_IDS } from "./rbac";

describe("rbac constants", () => {
  it("platform ops role ids are unique UUIDs", () => {
    const set = new Set(PLATFORM_OPS_ROLE_IDS);
    expect(set.size).toBe(PLATFORM_OPS_ROLE_IDS.length);
    for (const id of PLATFORM_OPS_ROLE_IDS) {
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    }
  });
});
