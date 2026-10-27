export function AdminDashboardPage() {
  const stats = [
    { label: 'Total tools', value: '8' },
    { label: 'Files processed', value: '12.4k' },
    { label: 'Avg. processing time', value: '2.3s' },
    { label: 'Support tickets', value: '14' },
  ];

  const recentActivity = [
    'ZIP export generated successfully',
    'Background removal job completed',
    'Resize request processed for 4 images',
    'Admin login verified from trusted session',
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-slate-800">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Dashboard</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Admin overview</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Recent activity</h2>
          <ul className="mt-4 space-y-3">
            {recentActivity.map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Status</h2>
          <div className="mt-4 space-y-4">
            <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
              System healthy
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
              Analytics connected
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
              Maintenance window: 02:00 UTC
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
