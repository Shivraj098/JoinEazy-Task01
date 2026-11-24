import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError, api, getFieldErrors } from "../../lib/api";
import { Button } from "../../components/Button";
import { FormField } from "../../components/FormField";
import { useAuth } from "../auth/AuthContext";
import type { AvailableStudent, StudentGroup } from "./types";

function ErrorMessage({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
    >
      {children}
    </p>
  );
}

export default function GroupPage() {
  const { user } = useAuth();
  const [group, setGroup] = useState<StudentGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<AvailableStudent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();

  const loadGroup = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<{ group: StudentGroup | null }>("/groups/me");
      setGroup(result.group);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load your group.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGroup();
  }, [loadGroup]);

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldError(undefined);
    try {
      const result = await api.post<{ group: StudentGroup }>("/groups", { name: groupName });
      setGroup(result.group);
      setGroupName("");
    } catch (cause) {
      const fields = getFieldErrors(cause);
      setFieldError(fields.name);
      setError(
        Object.keys(fields).length
          ? null
          : cause instanceof ApiError
            ? cause.message
            : "Could not create the group.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function searchStudents(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (search.trim().length < 2) {
      setError("Enter at least 2 characters to search.");
      return;
    }
    setBusy(true);
    setError(null);
    setStudents([]);
    try {
      const result = await api.get<{ students: AvailableStudent[] }>(
        `/students/search?q=${encodeURIComponent(search.trim())}`,
      );
      setStudents(result.students);
      if (result.students.length === 0) setError("No available students matched that search.");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Student search failed.");
    } finally {
      setBusy(false);
    }
  }

  async function addStudent(student: AvailableStudent) {
    if (!group) return;
    setBusy(true);
    setError(null);
    const identifier = search.includes("@") ? student.email : (student.studentId ?? student.email);
    try {
      const result = await api.post<{ group: StudentGroup }>(`/groups/${group.id}/members`, {
        identifier,
      });
      setGroup(result.group);
      setStudents([]);
      setSearch("");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not add this student.");
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <p role="status" className="text-sm text-slate-500">
        Loading group…
      </p>
    );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-indigo-700">Student workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">My group</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create your group and manage its members from one place.
        </p>
      </header>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {!group ? (
        <section className="max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold">Create a group</h2>
          <p className="mt-1 text-sm text-slate-600">
            You will become the group leader. You can add other registered students after creation.
          </p>
          <form onSubmit={(event) => void createGroup(event)} className="mt-5 space-y-4">
            <FormField
              label="Group name"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              maxLength={60}
              error={fieldError}
              required
            />
            <Button type="submit" disabled={busy || groupName.trim().length < 2}>
              {busy ? "Creating…" : "Create group"}
            </Button>
          </form>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Your group
                </p>
                <h2 className="mt-1 text-xl font-semibold">{group.name}</h2>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                {group.members.length} {group.members.length === 1 ? "member" : "members"}
              </span>
            </div>
            <div className="mt-5 divide-y divide-slate-100">
              {group.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{member.student.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {member.student.email} · {member.student.studentId ?? "No student ID"}
                    </p>
                  </div>
                  {member.studentId === group.leaderId && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      Leader
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
          {group.leaderId === user?.id && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold">Add a member</h2>
              <p className="mt-1 text-sm text-slate-600">
                Search by name, email or official student ID. Only students who are not already in a
                group appear.
              </p>
              <form onSubmit={(event) => void searchStudents(event)} className="mt-4 space-y-3">
                <FormField
                  label="Find a student"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name, email or student ID"
                  maxLength={100}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={busy || search.trim().length < 2}
                >
                  Search students
                </Button>
              </form>
              {students.length > 0 && (
                <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {students.map((student) => (
                    <div key={student.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{student.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {student.email} · {student.studentId}
                        </p>
                      </div>
                      <Button disabled={busy} onClick={() => void addStudent(student)}>
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
