export default function AdminLoading() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-48 animate-pulse rounded bg-black/[0.06]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card h-20 animate-pulse bg-black/[0.02]" />
        ))}
      </div>
      <div className="card h-64 animate-pulse bg-black/[0.02]" />
    </div>
  );
}
