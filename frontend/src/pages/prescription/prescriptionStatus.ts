export const isAnalyzedStatus = (status: string) => status === "needs_review" || status === "completed";
export const statusLabel = (status: string) => ({ needs_review: "Analyzed", completed: "Analyzed", analyzed: "Analyzed", processing: "Processing", failed: "Analysis failed" }[status] || status);
export function prescriptionCounts(records: readonly { status: string }[]) {
  return { total: records.length, analyzed: records.filter((row) => isAnalyzedStatus(row.status)).length, failed: records.filter((row) => row.status === "failed").length };
}
