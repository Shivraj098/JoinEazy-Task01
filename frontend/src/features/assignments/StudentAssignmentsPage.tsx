import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ApiError, api } from "../../lib/api";
import type { GroupAssignmentStatus, StudentAssignment } from "./types";

const labels: Record<GroupAssignmentStatus, string> = { PENDING: "Pending", IN_PROGRESS: "In progress", OVERDUE: "Overdue", COMPLETED: "Completed", COMPLETED_LATE: "Completed late" };
const styles: Record<GroupAssignmentStatus, string> = { PENDING: "bg-slate-100 text-slate-700", IN_PROGRESS: "bg-amber-50 text-amber-800", OVERDUE: "bg-red-50 text-red-800", COMPLETED: "bg-emerald-50 text-emerald-800", COMPLETED_LATE: "bg-orange-50 text-orange-800" };
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let active = true; api.get<{ assignments: StudentAssignment[]; groupId: string | null }>("/assignments").then((result) => { if (active) { setAssignments(result.assignments); setGroupId(result.groupId); } }).catch((cause) => { if (active) setError(cause instanceof ApiError ? cause.message : "Could not load assignments."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);

  return <div className="space-y-6">
    <header><p className="text-sm font-medium text-indigo-700">Student workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Assignments</h1><p className="mt-1 text-sm text-slate-600">Assignments shared with all students or assigned to your group.</p></header>
    {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
    {!groupId && !loading && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">You can view all-student assignments, but you need a group before confirming a submission. <Link to="/student/group" className="font-semibold underline">Create a group</Link>.</p>}
    {loading ? <p role="status" className="text-sm text-slate-500">Loading assignments…</p> : assignments.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center"><h2 className="font-semibold">No assignments available</h2><p className="mt-1 text-sm text-slate-600">New assignments will appear here when a professor shares them with your group or all students.</p></div> :
      <div className="grid gap-4 md:grid-cols-2">{assignments.map((assignment) => <article key={assignment.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3"><h2 className="font-semibold">{assignment.title}</h2><span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{assignment.targetType === "ALL_STUDENTS" ? "All students" : "Your group"}</span></div>
        <p className="mt-2 line-clamp-3 text-sm text-slate-600">{assignment.description}</p><p className="mt-4 text-xs text-slate-500">Due {formatDate(assignment.dueAt)}</p>
        {assignment.groupProgress && <div className="mt-4"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-600">{labels[assignment.groupProgress.status]}</span><span className="text-xs tabular-nums text-slate-600">{assignment.groupProgress.progressPercentage}% · {assignment.groupProgress.confirmedCount}/{assignment.groupProgress.memberCount}</span></div><progress aria-label={`${assignment.title} group progress: ${assignment.groupProgress.progressPercentage}%`} max={100} value={assignment.groupProgress.progressPercentage} className="mt-1.5 h-2 w-full accent-emerald-600" />{!assignment.currentUserConfirmed && <p className="mt-1 text-xs font-medium text-amber-700">Your confirmation is still pending</p>}</div>}
        <Link to={`/student/assignments/${assignment.id}`} className="mt-4 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-900">View assignment <span aria-hidden="true" className="ml-1">→</span></Link>
      </article>)}</div>}
  </div>;
}
