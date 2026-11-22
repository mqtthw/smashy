// Round names in Spanish: the bracket code names rounds in English, and they're translated where shown.
import { describe, expect, it } from "vitest";
import { translate, type MessageKey, type Values } from "@/lib/i18n/core";
import { localFeeder, localRound } from "@/lib/i18n/rounds";

const es = (key: MessageKey, values?: Values) => translate("es", key, values);
const en = (key: MessageKey, values?: Values) => translate("en", key, values);

describe("localRound", () => {
  it("translates elimination rounds", () => {
    expect(localRound("Winners Final", es)).toBe("Final de Winners");
    expect(localRound("Winners Semi-Final", es)).toBe("Semifinal de Winners");
    expect(localRound("Winners Quarter-Final", es)).toBe("Cuartos de final de Winners");
    expect(localRound("Winners Round 3", es)).toBe("Ronda 3 de Winners");
    expect(localRound("Losers Semi-Final", es)).toBe("Semifinal de Losers");
    expect(localRound("Losers Round 12", es)).toBe("Ronda 12 de Losers");
    expect(localRound("Grand Final", es)).toBe("Gran Final");
    expect(localRound("Grand Final Reset", es)).toBe("Reset de la Gran Final");
  });

  it("translates single elimination, round robin and Swiss rounds, and bracket parts", () => {
    expect(localRound("Final", es)).toBe("Final");
    expect(localRound("Semi-Final", es)).toBe("Semifinal");
    expect(localRound("Round 2", es)).toBe("Ronda 2");
    expect(localRound("Pool 3", es)).toBe("Pool 3");
    expect(localRound("Swiss rounds", es)).toBe("Rondas suizas");
    expect(localRound("Final bracket", es)).toBe("Bracket final");
  });

  it("translates empty slots", () => {
    expect(localRound("Winner of B", es)).toBe("Ganador de B");
    expect(localRound("Loser of AC", es)).toBe("Perdedor de AC");
  });

  it("leaves English as it was, and unknown labels alone", () => {
    for (const label of ["Winners Final", "Winners Semi-Final", "Losers Round 4", "Grand Final", "Grand Final Reset", "Round 1", "Pool 2", "Winner of B", "Loser of ?", "Final bracket"]) {
      expect(localRound(label, en)).toBe(label);
    }
    expect(localRound("Top 8 Bracket", es)).toBe("Top 8 Bracket");
    expect(localRound("Winners Something", es)).toBe("Winners Something");
  });
});

describe("localFeeder", () => {
  it("translates the waiting line, keeping names and setups", () => {
    expect(localFeeder("Being played now: Bob 1–0 Cara", es)).toBe("Se está jugando ahora: Bob 1–0 Cara");
    expect(localFeeder("Bob vs Cara is about to start on Setup 2", es)).toBe("Bob vs Cara está por empezar en Setup 2");
    expect(localFeeder("Bob vs Cara is about to start", es)).toBe("Bob vs Cara está por empezar");
    expect(localFeeder("Bob vs Cara is about to start on Setup 2", en)).toBe("Bob vs Cara is about to start on Setup 2");
    expect(localFeeder("Something else", es)).toBe("Something else");
  });
});
