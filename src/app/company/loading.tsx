export default function CompanyLoading() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-6 w-56" />
      <div className="card h-72 overflow-hidden">
        <div className="skeleton h-full w-full rounded-none" />
      </div>
    </div>
  );
}
