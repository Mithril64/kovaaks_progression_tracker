import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
import React from "react";
import ReactDOM from "react-dom/client";
import { AppShell } from "./components/AppShell";
import { BenchmarksPage } from "./routes/BenchmarksPage";
import { DashboardPage } from "./routes/DashboardPage";
import { ScenarioPage } from "./routes/ScenarioPage";
import "./styles.css";

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const scenarioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scenario/$scenarioId",
  component: ScenarioPage,
});

const benchmarksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/benchmarks",
  component: BenchmarksPage,
});

const routeTree = rootRoute.addChildren([indexRoute, scenarioRoute, benchmarksRoute]);
const router = createRouter({ routeTree });
const queryClient = new QueryClient();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
