import { describe, it, expect } from "vitest";
import { splitGraphemes, countGraphemes, firstGrapheme } from "./graphemes";

describe("graphemes", () => {
  it("segmenta emojis simples i compostos amb splitGraphemes", () => {
    expect(splitGraphemes("🏛️🐮")).toEqual(["🏛️", "🐮"]);
    expect(splitGraphemes("🏊‍♀️🌲")).toEqual(["🏊‍♀️", "🌲"]);
    expect(splitGraphemes("")).toEqual([]);
  });

  it("compta els grafemes correctament amb countGraphemes", () => {
    expect(countGraphemes("🏛️🐮")).toBe(2);
    expect(countGraphemes("🏊‍♀️🌲")).toBe(2);
    expect(countGraphemes("")).toBe(0);
  });

  it("extreu el primer grafema amb firstGrapheme", () => {
    expect(firstGrapheme("🏛️🐮")).toBe("🏛️");
    expect(firstGrapheme("🏊‍♀️🌲")).toBe("🏊‍♀️");
    expect(firstGrapheme("")).toBe("");
  });
});
