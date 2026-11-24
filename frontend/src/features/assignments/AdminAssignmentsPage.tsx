import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ApiError, api } from "../../lib/api";
import type { AdminAssignment } from "./types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<AdminAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    api
      .get<{ assignments: AdminAssignment[] }>("/admin/assignments")
      .then((data) => {
        if (active) setAssignments(data.assignments);
      })
      .catch((cause) => {
        if (active)
          setError(cause instanceof ApiError ? cause.message : "Could not load assignments.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-indigo-700">Professor workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Assignments</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create assignments and control which groups can access them.
          </p>
        </div>
        <Link
          to="/admin/assignments/new"
          className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Create assignment
        </Link>
      </header>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="text-sm text-slate-500">
          Loading assignments…
        </p>
      ) : assignments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="font-semibold">No assignments yet</h2>
          <p className="mt-1 text-sm text-slate-600">
            Create your first assignment to share it with students.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Assignment</th>
                  <th className="px-4 py-3 font-medium">Distribution</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 font-medium">Confirmations</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-900">{assignment.title}</p>
                      <p className="mt-1 max-w-sm truncate text-xs text-slate-500">
                        {assignment.description}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {assignment.targetType === "ALL_STUDENTS"
                        ? "All students"
                        : `${assignment.groups.length} selected groups`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                      {formatDate(assignment.dueAt)}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{assignment._count.confirmations}</td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        to={`/admin/assignments/${assignment.id}/edit`}
                        className="font-medium text-indigo-700 hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
