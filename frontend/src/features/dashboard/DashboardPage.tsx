import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ApiError, api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import type { GroupAssignmentStatus, StudentAssignment } from "../assignments/types";

const statusLabels: Record<GroupAssignmentStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  OVERDUE: "Overdue",
  COMPLETED: "Completed",
  COMPLETED_LATE: "Completed late",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.get<{ assignments: StudentAssignment[]; groupId: string | null }>("/assignments")
      .then((data) => {
        if (active) {
          setAssignments(data.assignments);
          setGroupId(data.groupId);
        }
      })
      .catch((cause) => {
        if (active) setError(cause instanceof ApiError ? cause.message : "Could not load your assignments.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => ({
    total: assignments.length,
    needAction: groupId ? assignments.filter((item) => !item.currentUserConfirmed).length : 0,
    overdue: groupId ? assignments.filter((item) => item.groupProgress?.status === "OVERDUE").length : 0,
    completed: groupId ? assignments.filter((item) => item.groupProgress?.status === "COMPLETED" || item.groupProgress?.status === "COMPLETED_LATE").length : 0,
  }), [assignments, groupId]);
  const attention = groupId ? assignments.filter((item) => !item.currentUserConfirmed).slice(0, 4) : [];

  if (!user) return null;

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm font-medium text-indigo-700">Student workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Welcome back, {user.name}</h1>
        <p className="mt-1 text-sm text-slate-600">Here is what needs your attention.</p>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      {!groupId && !loading && (
        <section className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-5">
          <h2 className="font-semibold">Start by creating your group</h2>
          <p className="mt-1 text-sm text-slate-600">A group is required before you can confirm assignment submissions.</p>
          <Link to="/student/group" className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-indigo-700 hover:underline">Create your group</Link>
        </section>
      )}

      <section aria-label="Assignment summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Available assignments", value: counts.total },
          { label: "Awaiting your confirmation", value: counts.needAction },
          { label: "Overdue group assignments", value: counts.overdue },
          { label: "Completed group assignments", value: counts.completed },
        ].map((item) => (
          <article key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-medium text-slate-500">{item.label}</h2>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{loading ? "—" : item.value}</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="attention-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="attention-heading" className="font-semibold">Needs your attention</h2>
            <p className="mt-1 text-sm text-slate-600">Confirm after your group has uploaded the work.</p>
          </div>
          <Link to="/student/assignments" className="inline-flex min-h-10 items-center text-sm font-semibold text-indigo-700 hover:underline">All assignments</Link>
        </div>
        {loading ? (
          <p role="status" className="mt-5 text-sm text-slate-500">Loading your work…</p>
        ) : attention.length === 0 ? (
          <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">You have no pending personal confirmations.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {attention.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">Due {formatDate(item.dueAt)} · {item.groupProgress ? statusLabels[item.groupProgress.status] : "Group required"}</p>
                </div>
                <Link to={`/student/assignments/${item.id}`} className="inline-flex min-h-10 items-center text-sm font-semibold text-indigo-700 hover:underline">Open</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
