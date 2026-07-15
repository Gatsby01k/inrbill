export function Flash({ notice, error }: { notice?: string; error?: string }) {
  if (!notice && !error) return null;
  return <div className={`mb-5 rounded-lg border p-3 text-xs ${error ? "border-rose-300 bg-rose-50 text-rose-700" : "border-leaf-300 bg-leaf-50 text-leaf-700"}`}>{error ?? notice}</div>;
}
