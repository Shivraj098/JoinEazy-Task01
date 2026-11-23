import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ApiError, api } from "../../lib/api";
import type { StudentAssignment } from "./types";

function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(new Date(value)); }

export default function StudentAssignmentDetailPage() {
  const { assignmentId } = useParams();
  const [assignment, setAssignment] = useState<StudentAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!assignmentId) return;
    let active = true;
    api.get<{ assignment: StudentAssignment; groupId: string | null }>(`/assignments/${assignmentId}`)
      .then((result) => { if (active) setAssignment(result.assignment); })
      .catch((cause) => { if (active) setError(cause instanceof ApiError ? cause.message : "Could not load this assignment."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [assignmentId]);

  if (loading) return <p role="status" className="text-sm text-slate-500">Loading assignment…</p>;
  if (error || !assignment) return <div className="space-y-3"><p role="alert" className="text-sm text-red-700">{error ?? "Assignment not found."}</p><Link className="text-sm font-medium text-indigo-700" to="/student/assignments">Back to assignments</Link></div>;

  return <article className="max-w-3xl space-y-6">
    <Link to="/student/assignments" className="text-sm font-medium text-indigo-700 hover:underline">← All assignments</Link>
    <header><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{assignment.targetType === "ALL_STUDENTS" ? "Available to all students" : "Assigned to your group"}</span></div><h1 className="mt-3 text-2xl font-semibold tracking-tight">{assignment.title}</h1><p className="mt-2 text-sm text-slate-500">Posted by {assignment.createdBy.name} · Due {formatDate(assignment.dueAt)}</p></header>
    <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold">Instructions</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{assignment.description}</p></section>
    <section className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-5"><h2 className="text-sm font-semibold text-slate-900">Submission location</h2><p className="mt-1 text-sm text-slate-600">Upload your group’s work using the professor’s OneDrive link. Submission files are not uploaded to Joineazy.</p><a href={assignment.oneDriveUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Open OneDrive submission link <span aria-hidden="true" className="ml-2">↗</span></a></section>
  </article>;
}
