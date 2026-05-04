import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: PropsWithChildren<{ to: string }>) => <a>{children}</a>,
}));

describe("DashboardPage", () => {
  it("loads mock dashboard metrics in browser mode", async () => {
    const client = new QueryClient();

    render(
      <QueryClientProvider client={client}>
        <DashboardPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("1wall6targets small")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search scenarios")).toBeInTheDocument();
  });
});
