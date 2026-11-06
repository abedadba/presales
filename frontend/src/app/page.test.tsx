import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("Lead Call Generator page (PS-4)", () => {
  it("renders the form, template selector and preview", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: /lead call generator/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    expect(screen.getByTestId("template-select")).toBeInTheDocument();
    expect(screen.getByTestId("preview-rendered")).toBeInTheDocument();
    // Empty state: download is blocked and blockers are listed.
    expect(screen.getByTestId("download-blockers")).toBeInTheDocument();
  });

  it("loads an example and previews its company without data loss", async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: /load example lead \(northwind\)/i }));

    expect((screen.getByLabelText(/company name/i) as HTMLInputElement).value).toBe("Northwind Traders");
    expect(screen.getByTestId("preview-rendered")).toHaveTextContent("Northwind Traders");
    expect(screen.getByTestId("preview-rendered")).toHaveTextContent("priya.nair@example.invalid");
    expect(screen.getByTestId("download-ready")).toBeInTheDocument();
    expect(screen.getByTestId("download-btn")).toBeEnabled();
  });

  it("shows a field error for an invalid email and blocks download", async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: /load example lead \(northwind\)/i }));
    const email = screen.getByLabelText(/contact email/i);
    await user.clear(email);
    await user.type(email, "not-an-email");
    await user.tab();

    expect(screen.getByText(/Enter a valid email address/)).toBeInTheDocument();
    expect(screen.getByTestId("download-btn")).toBeDisabled();
  });

  it("switches template and updates the preview", async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: /load example lead \(northwind\)/i }));
    await user.selectOptions(screen.getByTestId("template-select"), "soft-call-script");

    expect(screen.getByRole("heading", { level: 2, name: /soft call script/i })).toBeInTheDocument();
  });
});
