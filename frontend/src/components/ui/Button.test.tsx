import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("renders its children as text", () => {
    render(<Button>Klicka mig</Button>);
    expect(screen.getByRole("button", { name: "Klicka mig" })).toBeInTheDocument();
  });

  it("is disabled when the loading prop is set", () => {
    render(<Button loading>Sparar</Button>);
    const btn = screen.getByRole("button", { name: "Sparar" });
    expect(btn).toBeDisabled();
  });
});
