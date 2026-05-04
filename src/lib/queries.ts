import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: api.getDashboard });
}

export function useScenarios() {
  return useQuery({ queryKey: ["scenarios"], queryFn: api.getScenarios });
}

export function useScenarioRuns(scenarioId: number) {
  return useQuery({
    queryKey: ["scenario-runs", scenarioId],
    queryFn: () => api.getScenarioRuns(scenarioId),
    enabled: Number.isFinite(scenarioId),
  });
}

export function useBenchmarks() {
  return useQuery({ queryKey: ["benchmarks"], queryFn: api.getBenchmarks });
}

export function useBenchmarkProgress(benchmarkId: string | undefined) {
  return useQuery({
    queryKey: ["benchmark-progress", benchmarkId],
    queryFn: () => api.getBenchmarkProgress(benchmarkId as string),
    enabled: Boolean(benchmarkId),
  });
}

export function useImportStats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.importStats,
    onSuccess: async () => {
      await queryClient.invalidateQueries();
    },
  });
}
