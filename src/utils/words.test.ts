import { describe, it, expect } from "vitest";
import { parseWords } from "./words";

describe("parseWords", () => {
  it("desglossa correctament paraules simples", () => {
    expect(parseWords("Vic")).toEqual([{ length: 3, apostrophes: [] }]);
  });

  it("desglossa paraules compostes amb espais", () => {
    expect(parseWords("Sant Cugat")).toEqual([
      { length: 4, apostrophes: [] },
      { length: 5, apostrophes: [] },
    ]);
  });

  it("detecta apòstrofs i guions", () => {
    expect(parseWords("Castell-Platja d’Aro")).toEqual([
      { length: 7, apostrophes: [] },
      { length: 6, apostrophes: [] },
      { length: 4, apostrophes: [1] },
    ]);
    expect(parseWords("L’Escala")).toEqual([
      { length: 7, apostrophes: [1] },
    ]);
  });
});
