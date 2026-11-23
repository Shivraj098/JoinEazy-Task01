import { useAuth } from "../auth/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  const details: Array<[string, string]> = [
    ["Name", user.name],
    ["Email", user.email],
    ...(user.studentId ? ([["Student ID", user.studentId]] as Array<[string, string]>) : []),
    ["Role", user.role === "ADMIN" ? "Professor" : "Student"],
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user.name}</h1>
      <p className="mt-1 text-slate-600">You are signed in.</p>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-slate-500">Your account</h2>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="mt-0.5 break-words text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
