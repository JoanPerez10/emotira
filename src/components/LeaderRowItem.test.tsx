import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LeaderRowItem from "./LeaderRowItem";

describe("LeaderRowItem", () => {
  it("renderitza una fila normal de rànquing", () => {
    render(<LeaderRowItem row={{ rank: 1, username: "marta", value: 25, isMe: false }} mode="ten" />);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("marta")).toBeInTheDocument();
    expect(screen.getByText("25 / 30")).toBeInTheDocument();
  });

  it("afegeix indicador i classe quan és l'usuari actual", () => {
    const { container } = render(
      <LeaderRowItem row={{ rank: 3, username: "joan", value: 12, isMe: true }} mode="timeTrial" />
    );
    expect(screen.getByText("joan (tu)")).toBeInTheDocument();
    expect(screen.getByText("12 pobles")).toBeInTheDocument();
    expect(container.querySelector("li")).toHaveClass("me");
  });
});
