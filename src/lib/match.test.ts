import { describe, expect, it } from "vitest";
import { hasKeyword } from "./match";

describe("hasKeyword", () => {
  it("matches spoken compound numbers to digits", () => {
    expect(hasKeyword("over sixty three percent of income", "63")).toBe(true);
    expect(hasKeyword("over sixty-three percent", "63")).toBe(true);
  });
  it("matches spoken single numbers to digits", () => {
    expect(hasKeyword("business reaches ten percent of income", "10")).toBe(true);
    expect(hasKeyword("eighty percent of new wealth", "80")).toBe(true);
  });
  it("treats % and percent the same", () => {
    expect(hasKeyword("over 63% of income", "63 percent")).toBe(true);
    expect(hasKeyword("over 63 percent", "63%")).toBe(true);
  });
  it("does not match a different number", () => {
    expect(hasKeyword("sixty percent", "63")).toBe(false);
    expect(hasKeyword("seventy three", "63")).toBe(false);
  });
  it("still ignores case, punctuation and hyphens", () => {
    expect(hasKeyword("It's NON-RENEWABLE.", "nonrenewable")).toBe(true);
    expect(hasKeyword("nonrenewable", "non-renewable")).toBe(true);
    expect(hasKeyword("To a small extent, because...", "small extent")).toBe(true);
    expect(hasKeyword("Preconditions to take-off", "preconditions")).toBe(true);
  });
  it("number words inside keywords still match", () => {
    expect(hasKeyword("China's one-child policy", "one child policy")).toBe(true);
  });
});

describe("norm edge cases", () => {
  it("leaves object-prototype words alone", () => {
    expect(hasKeyword("the constructor of the model", "constructor")).toBe(true);
    expect(hasKeyword("toString", "tostring")).toBe(true);
  });
});
