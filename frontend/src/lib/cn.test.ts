import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy class names with spaces", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters out falsy values", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
    expect(cn("a", null, undefined, "d")).toBe("a d");
  });

  it("returns empty string when all values are falsy", () => {
    expect(cn(false && "x", null, undefined)).toBe("");
  });
});
