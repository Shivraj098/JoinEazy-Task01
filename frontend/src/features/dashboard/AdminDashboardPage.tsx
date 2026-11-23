import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ApiError, api } from "../../lib/api";
import type { GroupAssignmentStatus } from "../assignments/types";
import type { AdminMonitoringResponse, AdminOverview } from "./admin-monitoring.types";

const statuses: GroupAssignmentStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "OVERDUE",
  "COMPLETED",
  "COMPLETED_LATE",
];

const statusLabels: Record<GroupAssignmentStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  OVERDUE: "Overdue",
  COMPLETED: "Completed",
  COMPLETED_LATE: "Completed late",
};

const statusClasses: Record<GroupAssignmentStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-amber-50 text-amber-800",
  OVERDUE: "bg-red-50 text-red-800",
  COMPLETED: "bg-emerald-50 text-emerald-800",
  COMPLETED_LATE: "bg-orange-50 text-orange-800",
};

const statusBarClasses: Record<GroupAssignmentStatus, string> = {
  PENDING: "bg-slate-300",
  IN_PROGRESS: "bg-amber-400",
  OVERDUE: "bg-red-500",
  COMPLETED: "bg-emerald-600",
  COMPLETED_LATE: "bg-orange-500",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function StatusBadge({ status }: { status: GroupAssignmentStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: number | string; detail?: string }) {
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-xs font-medium text-slate-500">{label}</h2>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">{value.toLocaleString()}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </article>
  );
}

function StatusBreakdown({ counts }: { counts: Record<GroupAssignmentStatus, number> }) {
  const total = statuses.reduce((sum, status) => sum + counts[status], 0);
  return (
    <section aria-labelledby="status-breakdown-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="status-breakdown-heading" className="font-semibold">Submission status breakdown</h2>
          <p className="mt-1 text-sm text-slate-600">Eligible group-assignment pairs across the workspace.</p>
        </div>
        <span className="text-xs tabular-nums text-slate-500">{total.toLocaleString()} total</span>
      </div>
      {total === 0 ? (
        <p className="mt-5 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">There are no eligible group-assignment pairs to report yet.</p>
      ) : (
        <>
          <div
            className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-slate-100"
            role="img"
            aria-label={statuses.map((status) => `${statusLabels[status]}: ${counts[status]}`).join(", ")}
          >
            {statuses.map((status) => (
              <span
                key={status}
                className={`${statusBarClasses[status]} h-full`}
                style={{ width: `${(counts[status] / total) * 100}%` }}
              />
            ))}
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {statuses.map((status) => (
              <li key={status} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-slate-600">
                  <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusBarClasses[status]}`} />
                  <span className="truncate">{statusLabels[status]}</span>
                </span>
                <strong className="tabular-nums text-slate-900">{counts[status]}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function GroupProgressCard({
  group,
}: {
  group: AdminMonitoringResponse["assignments"][number]["groups"][number];
}) {
  const { progress } = group;
  return (
    <details className="group rounded-lg border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-lg p-4 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-900">{group.name}</span>
          <span className="mt-1 block text-xs text-slate-500">
            {progress.confirmedCount} of {progress.memberCount} members confirmed
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold tabular-nums text-slate-700">{progress.progressPercentage}%</span>
          <StatusBadge status={progress.status} />
          <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-180">⌄</span>
        </span>
      </summary>
      <div className="border-t border-slate-100 px-4 py-4">
        <div className="flex items-center justify-between gap-3 text-xs text-slate-600">
          <span>Group progress</span>
          <span>{progress.confirmedCount}/{progress.memberCount} confirmations</span>
        </div>
        <progress
          className="mt-2 h-2.5 w-full overflow-hidden rounded-full accent-emerald-600"
          max={100}
          value={progress.progressPercentage}
          aria-label={`${group.name} submission progress: ${progress.progressPercentage}%`}
        />
        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Member confirmations</h3>
        {progress.members.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">This group has no current members.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {progress.members.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-900">{member.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {member.studentId ?? member.email}
                  </span>
                </span>
                {member.isConfirmed ? (
                  <span className="text-right">
                    <span className="block text-xs font-semibold text-emerald-700">Confirmed</span>
                    <time className="block text-xs text-slate-500" dateTime={member.confirmedAt ?? undefined}>
                      {member.confirmedAt ? formatDate(member.confirmedAt) : "Recorded"}
                    </time>
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">Pending</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [monitoring, setMonitoring] = useState<AdminMonitoringResponse | null>(null);
  const [assignmentFilter, setAssignmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<GroupAssignmentStatus | "">("");
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [monitoringLoading, setMonitoringLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [monitoringError, setMonitoringError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.get<AdminOverview>("/admin/overview")
      .then((data) => { if (active) setOverview(data); })
      .catch((cause) => {
        if (active) setOverviewError(cause instanceof ApiError ? cause.message : "Could not load the professor overview.");
      })
      .finally(() => { if (active) setOverviewLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setMonitoringLoading(true);
    setMonitoringError(null);
    const query = new URLSearchParams();
    if (assignmentFilter) query.set("assignmentId", assignmentFilter);
    if (statusFilter) query.set("status", statusFilter);
    const queryString = query.toString();
    const suffix = queryString ? `?${queryString}` : "";

    api.get<AdminMonitoringResponse>(`/admin/monitoring${suffix}`)
      .then((data) => { if (active) setMonitoring(data); })
      .catch((cause) => {
        if (active) setMonitoringError(cause instanceof ApiError ? cause.message : "Could not load group monitoring.");
      })
      .finally(() => { if (active) setMonitoringLoading(false); });
    return () => { active = false; };
  }, [assignmentFilter, statusFilter]);

  const summary = overview?.summary;
  const visibleGroupCount = useMemo(
    () => monitoring?.assignments.reduce((total, assignment) => total + assignment.groups.length, 0) ?? 0,
    [monitoring],
  );

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-indigo-700">Professor workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">Monitor assignment completion across groups and review each student’s confirmation.</p>
        </div>
        <Link to="/admin/assignments" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
          Manage assignments
        </Link>
      </header>

      {overviewError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{overviewError}</p>}

      <section aria-label="Workspace summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="Students" value={overviewLoading ? "—" : summary?.studentCount ?? 0} />
        <SummaryCard label="Students without a group" value={overviewLoading ? "—" : summary?.ungroupedStudentCount ?? 0} />
        <SummaryCard label="Groups" value={overviewLoading ? "—" : summary?.groupCount ?? 0} />
        <SummaryCard label="Assignments" value={overviewLoading ? "—" : summary?.assignmentCount ?? 0} />
        <SummaryCard label="Completed group-assignment pairs" value={overviewLoading ? "—" : summary?.completedGroupAssignmentPairs ?? 0} />
        <SummaryCard label="Overdue group-assignment pairs" value={overviewLoading ? "—" : summary?.overdueGroupAssignmentPairs ?? 0} />
      </section>

      <section aria-labelledby="overall-completion-heading" className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="overall-completion-heading" className="font-semibold text-slate-900">Overall completion</h2>
            <p className="mt-1 text-sm text-slate-600">Completed group-assignment pairs divided by all eligible group-assignment pairs.</p>
          </div>
          <p className="text-3xl font-semibold tabular-nums text-indigo-800">{overviewLoading ? "—" : `${summary?.overallCompletionPercentage ?? 0}%`}</p>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-600">
          <span>{summary?.completedGroupAssignmentPairs ?? 0} completed</span>
          <span>{summary?.eligibleGroupAssignmentPairs ?? 0} eligible pairs</span>
        </div>
        <progress
          className="mt-2 h-2.5 w-full overflow-hidden rounded-full accent-indigo-600"
          max={100}
          value={summary?.overallCompletionPercentage ?? 0}
          aria-label={`Overall assignment completion: ${summary?.overallCompletionPercentage ?? 0}%`}
        />
      </section>

      {overview && <StatusBreakdown counts={summary!.statusBreakdown} />}

      <section id="group-monitoring" aria-labelledby="group-monitoring-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="group-monitoring-heading" className="text-lg font-semibold tracking-tight">Group monitoring</h2>
            <p className="mt-1 text-sm text-slate-600">Expand a group to inspect each member’s confirmation and timestamp.</p>
          </div>
          <span className="text-xs tabular-nums text-slate-500">{visibleGroupCount} group records</span>
        </div>

        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <div>
            <label htmlFor="assignment-filter" className="mb-1 block text-xs font-medium text-slate-700">Assignment</label>
            <select id="assignment-filter" value={assignmentFilter} onChange={(event) => setAssignmentFilter(event.target.value)} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <option value="">All assignments</option>
              {(overview?.assignments ?? []).map((assignment) => <option key={assignment.id} value={assignment.id}>{assignment.title}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="status-filter" className="mb-1 block text-xs font-medium text-slate-700">Group status</label>
            <select id="status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as GroupAssignmentStatus | "")} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <option value="">All statuses</option>
              {statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
            </select>
          </div>
        </div>

        {monitoringError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{monitoringError}</p>}
        {monitoringLoading ? (
          <p role="status" className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading group monitoring…</p>
        ) : monitoring && monitoring.assignments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h3 className="font-semibold text-slate-900">No matching group submissions</h3>
            <p className="mt-1 text-sm text-slate-600">Try a different assignment or status filter.</p>
          </div>
        ) : (
          <div className="space-y-5" aria-live="polite">
            {monitoring?.assignments.map((assignment) => (
              <section key={assignment.id} aria-labelledby={`assignment-${assignment.id}`} className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 id={`assignment-${assignment.id}`} className="font-semibold text-slate-900">{assignment.title}</h3>
                  <span className="text-xs text-slate-500">Due {formatDate(assignment.dueAt)}</span>
                </div>
                {assignment.groups.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">No groups are currently eligible for this assignment.</p>
                ) : (
                  <div className="space-y-2">{assignment.groups.map((group) => <GroupProgressCard key={group.id} group={group} />)}</div>
                )}
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
