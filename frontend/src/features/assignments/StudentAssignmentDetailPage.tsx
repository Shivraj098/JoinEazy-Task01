import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ApiError, api } from "../../lib/api";
import type { GroupAssignmentProgress, GroupAssignmentStatus, StudentAssignment } from "./types";

interface AssignmentResult { assignment: StudentAssignment; groupId: string | null; groupProgress: GroupAssignmentProgress | null; currentUserConfirmed: boolean; }
interface ConfirmationResult { confirmation: { id: string; confirmedAt: string }; alreadyConfirmed: boolean; groupProgress: GroupAssignmentProgress; }
const statusLabels: Record<GroupAssignmentStatus, string> = { PENDING: "Pending", IN_PROGRESS: "In progress", OVERDUE: "Overdue", COMPLETED: "Completed", COMPLETED_LATE: "Completed late" };
const statusClasses: Record<GroupAssignmentStatus, string> = { PENDING: "bg-slate-100 text-slate-700", IN_PROGRESS: "bg-amber-50 text-amber-800", OVERDUE: "bg-red-50 text-red-800", COMPLETED: "bg-emerald-50 text-emerald-800", COMPLETED_LATE: "bg-orange-50 text-orange-800" };
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(new Date(value)); }

export default function StudentAssignmentDetailPage() {
  const { assignmentId } = useParams();
  const [result, setResult] = useState<AssignmentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!assignmentId) return;
    let active = true;
    api.get<AssignmentResult>(`/assignments/${assignmentId}`)
      .then((data) => { if (active) setResult(data); })
      .catch((cause) => { if (active) setError(cause instanceof ApiError ? cause.message : "Could not load this assignment."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [assignmentId]);

  async function confirmSubmission() {
    if (!assignmentId) return;
    setConfirming(true); setError(null); setNotice(null);
    try {
      const data = await api.post<ConfirmationResult>(`/submissions/${assignmentId}/confirm`);
      setResult((current) => current ? { ...current, currentUserConfirmed: true, groupProgress: data.groupProgress } : current);
      setNotice(data.alreadyConfirmed ? "Your confirmation was already recorded." : "Your confirmation has been recorded.");
      setConfirmOpen(false);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not confirm the submission.");
      setConfirmOpen(false);
    } finally { setConfirming(false); }
  }

  if (loading) return <p role="status" className="text-sm text-slate-500">Loading assignment…</p>;
  if (error && !result) return <div className="space-y-3"><p role="alert" className="text-sm text-red-700">{error}</p><Link className="text-sm font-medium text-indigo-700" to="/student/assignments">Back to assignments</Link></div>;
  if (!result) return <div><p className="text-sm text-slate-600">Assignment not found.</p><Link className="text-sm font-medium text-indigo-700" to="/student/assignments">Back to assignments</Link></div>;
  const { assignment, groupProgress, currentUserConfirmed, groupId } = result;
  const isOverdue = new Date(assignment.dueAt).getTime() < Date.now();

  return <article className="max-w-3xl space-y-6">
    <Link to="/student/assignments" className="text-sm font-medium text-indigo-700 hover:underline">← All assignments</Link>
    <header><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{assignment.targetType === "ALL_STUDENTS" ? "Available to all students" : "Assigned to your group"}</span>{groupProgress && <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[groupProgress.status]}`}>{statusLabels[groupProgress.status]}</span>}</div><h1 className="mt-3 text-2xl font-semibold tracking-tight">{assignment.title}</h1><p className="mt-2 text-sm text-slate-500">Posted by {assignment.createdBy.name} · Due {formatDate(assignment.dueAt)}</p></header>
    {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
    <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold">Instructions</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{assignment.description}</p></section>
    <section className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-5"><h2 className="text-sm font-semibold text-slate-900">Submission location</h2><p className="mt-1 text-sm text-slate-600">Upload your group’s work using the professor’s OneDrive link. Submission files are not uploaded to Joineazy.</p><a href={assignment.oneDriveUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Open OneDrive submission link <span aria-hidden="true" className="ml-2">↗</span></a></section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Group submission confirmation</h2><p className="mt-1 text-sm text-slate-600">Each member confirms individually after the group uploads its work.</p></div>{groupProgress && <span className="text-sm font-semibold text-slate-700">{groupProgress.confirmedCount}/{groupProgress.memberCount} confirmed</span>}</div>
      {!groupId ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Create or join a group before confirming a group submission.</p> : groupProgress && <>
        <div className="mt-5 flex items-center justify-between gap-3"><span className="text-sm font-medium">Group progress</span><span className="text-sm font-semibold tabular-nums">{groupProgress.progressPercentage}%</span></div>
        <progress aria-label={`Group submission progress: ${groupProgress.progressPercentage}%`} max={100} value={groupProgress.progressPercentage} className="mt-2 h-2.5 w-full overflow-hidden rounded-full accent-emerald-600" />
        <ul className="mt-4 divide-y divide-slate-100">{groupProgress.members.map((member) => <li key={member.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{member.name}</p><p className="truncate text-xs text-slate-500">{member.studentId ?? member.email}</p></div>{member.isConfirmed ? <span className="shrink-0 text-right"><span className="block text-xs font-semibold text-emerald-700">Confirmed</span><span className="block text-xs text-slate-500">{member.confirmedAt ? formatDate(member.confirmedAt) : "Recorded"}</span></span> : <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">Pending</span>}</li>)}</ul>
      </>}
      {currentUserConfirmed ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Your confirmation is recorded. Thank you.</p> : groupId && <Button className="mt-5" onClick={() => setConfirmOpen(true)}>Yes, I have submitted</Button>}
      {isOverdue && !currentUserConfirmed && <p className="mt-2 text-xs text-slate-500">The deadline has passed. You can still record your confirmation; the group will be marked completed late when every member confirms.</p>}
    </section>
    {confirmOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"><h2 id="confirm-title" className="text-lg font-semibold">Confirm your submission</h2><p className="mt-2 text-sm leading-6 text-slate-600">Please confirm that your group has uploaded its assignment to the professor’s OneDrive link. This records your confirmation and timestamp.</p><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" disabled={confirming} onClick={() => setConfirmOpen(false)}>Cancel</Button><Button disabled={confirming} onClick={() => void confirmSubmission()}>{confirming ? "Confirming…" : "Confirm submission"}</Button></div></section></div>}
  </article>;
}
