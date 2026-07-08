export default function AdminLoading() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-6 w-48" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card h-20 overflow-hidden">
            <div className="skeleton h-full w-full rounded-none" />
          </div>
        ))}
      </div>
      <div className="card h-64 overflow-hidden">
        <div className="skeleton h-full w-full rounded-none" />
      </div>
    </div>
  );
}
