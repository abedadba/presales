import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import HomePage from "./page";

describe("Lead Call Generator page (PS-4)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

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

  it("saves a named lead, loads it after clear, and deletes it", async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    // Saved leads panel is visible with empty state.
    expect(screen.getByRole("heading", { name: /^saved leads$/i })).toBeInTheDocument();
    expect(screen.getByTestId("saved-empty")).toBeInTheDocument();
    expect(screen.getByTestId("save-lead-btn")).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /load example lead \(northwind\)/i }));
    await user.type(screen.getByTestId("saved-lead-name"), "Northwind - Priya");
    expect(screen.getByTestId("save-lead-btn")).toBeEnabled();
    await user.click(screen.getByTestId("save-lead-btn"));

    expect(screen.getByTestId("saved-status")).toHaveTextContent(/Saved lead/);
    expect(screen.getByTestId("saved-count")).toHaveTextContent(/1 saved/);
    expect(screen.getByTestId("saved-list")).toHaveTextContent("Northwind - Priya");

    // Clear the form, then load the saved lead back.
    await user.click(screen.getByRole("button", { name: /^clear$/i }));
    expect((screen.getByLabelText(/company name/i) as HTMLInputElement).value).toBe("");

    const list = screen.getByTestId("saved-list");
    await user.click(within(list).getByRole("button", { name: /load saved lead/i }));
    expect((screen.getByLabelText(/company name/i) as HTMLInputElement).value).toBe("Northwind Traders");
    expect(screen.getByTestId("saved-status")).toHaveTextContent(/Loaded saved lead/);

    // Delete it.
    await user.click(within(screen.getByTestId("saved-list")).getByRole("button", { name: /delete saved lead/i }));
    expect(screen.getByTestId("saved-status")).toHaveTextContent(/Deleted saved lead/);
    expect(screen.getByTestId("saved-empty")).toBeInTheDocument();
  });
});
