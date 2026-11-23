import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button } from "../../components/Button";
import { FormField } from "../../components/FormField";
import { ApiError, api, getFieldErrors } from "../../lib/api";
import type { AdminAssignment, AssignmentGroupOption, AssignmentTarget } from "./types";

interface FormState { title: string; description: string; dueAt: string; oneDriveUrl: string; targetType: AssignmentTarget; groupIds: string[]; }
const emptyForm: FormState = { title: "", description: "", dueAt: "", oneDriveUrl: "", targetType: "ALL_STUDENTS", groupIds: [] };
function toLocalDateTime(value: string) { const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }

export default function AdminAssignmentFormPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(assignmentId);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [groups, setGroups] = useState<AssignmentGroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const selected = useMemo(() => new Set(form.groupIds), [form.groupIds]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [groupResult, assignmentResult] = await Promise.all([
          api.get<{ groups: AssignmentGroupOption[] }>("/admin/groups"),
          assignmentId ? api.get<{ assignment: AdminAssignment }>(`/admin/assignments/${assignmentId}`) : Promise.resolve(null),
        ]);
        if (!active) return;
        setGroups(groupResult.groups);
        if (assignmentResult) {
          const assignment = assignmentResult.assignment;
          setForm({ title: assignment.title, description: assignment.description, dueAt: toLocalDateTime(assignment.dueAt), oneDriveUrl: assignment.oneDriveUrl, targetType: assignment.targetType, groupIds: assignment.groups.map((entry) => entry.groupId) });
        }
      } catch (cause) { if (active) setError(cause instanceof ApiError ? cause.message : "Could not load the assignment form."); }
      finally { if (active) setLoading(false); }
    }
    void load(); return () => { active = false; };
  }, [assignmentId]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function toggleGroup(groupId: string) { update("groupIds", selected.has(groupId) ? form.groupIds.filter((id) => id !== groupId) : [...form.groupIds, groupId]); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null); setFieldErrors({});
    const payload = { ...form, dueAt: new Date(form.dueAt).toISOString(), groupIds: form.targetType === "SELECTED_GROUPS" ? form.groupIds : [] };
    try {
      if (editing && assignmentId) await api.patch(`/admin/assignments/${assignmentId}`, payload);
      else await api.post("/admin/assignments", payload);
      void navigate("/admin/assignments", { replace: true });
    } catch (cause) {
      const fields = getFieldErrors(cause); setFieldErrors(fields);
      setError(Object.keys(fields).length ? null : cause instanceof ApiError ? cause.message : "Could not save the assignment.");
      setSaving(false);
    }
  }

  if (loading) return <p role="status" className="text-sm text-slate-500">Loading assignment form…</p>;
  return <div className="mx-auto max-w-3xl space-y-6">
    <Link to="/admin/assignments" className="text-sm font-medium text-indigo-700 hover:underline">← All assignments</Link>
    <header><p className="text-sm font-medium text-indigo-700">Professor workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{editing ? "Edit assignment" : "Create assignment"}</h1><p className="mt-1 text-sm text-slate-600">Provide clear instructions and a secure OneDrive submission link.</p></header>
    {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
    <form onSubmit={(event) => void submit(event)} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <FormField label="Assignment title" value={form.title} onChange={(event) => update("title", event.target.value)} maxLength={150} error={fieldErrors.title} required />
      <div><label htmlFor="assignment-description" className="block text-sm font-medium text-slate-700">Description and instructions</label><textarea id="assignment-description" value={form.description} onChange={(event) => update("description", event.target.value)} rows={6} maxLength={10000} required aria-invalid={Boolean(fieldErrors.description)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" />{fieldErrors.description && <p className="mt-1 text-xs text-red-700">{fieldErrors.description}</p>}</div>
      <FormField label="Due date and time" type="datetime-local" value={form.dueAt} onChange={(event) => update("dueAt", event.target.value)} error={fieldErrors.dueAt} required />
      <FormField label="OneDrive submission URL" type="url" value={form.oneDriveUrl} onChange={(event) => update("oneDriveUrl", event.target.value)} error={fieldErrors.oneDriveUrl} hint="Use the HTTPS sharing link where students will upload their work." required />
      <fieldset className="space-y-3"><legend className="text-sm font-semibold text-slate-900">Who can access this assignment?</legend>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3"><input type="radio" name="targetType" checked={form.targetType === "ALL_STUDENTS"} onChange={() => update("targetType", "ALL_STUDENTS")} className="mt-1 accent-indigo-600" /><span><span className="block text-sm font-medium">All students</span><span className="mt-0.5 block text-xs text-slate-500">Available to every student, including groups created later.</span></span></label>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3"><input type="radio" name="targetType" checked={form.targetType === "SELECTED_GROUPS"} onChange={() => update("targetType", "SELECTED_GROUPS")} className="mt-1 accent-indigo-600" /><span><span className="block text-sm font-medium">Selected groups</span><span className="mt-0.5 block text-xs text-slate-500">Only the groups selected below can access this assignment.</span></span></label>
      </fieldset>
      {form.targetType === "SELECTED_GROUPS" && <fieldset className="space-y-2"><legend className="text-sm font-medium text-slate-700">Select groups</legend>{groups.length === 0 ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">There are no groups yet. Students must create groups before you can target them.</p> : <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">{groups.map((group) => <label key={group.id} className="flex cursor-pointer items-center justify-between gap-3 py-1"><span className="min-w-0"><span className="block truncate text-sm font-medium">{group.name}</span><span className="block text-xs text-slate-500">Leader: {group.leader.name} · {group._count.members} members</span></span><input type="checkbox" checked={selected.has(group.id)} onChange={() => toggleGroup(group.id)} className="h-4 w-4 accent-indigo-600" /></label>)}</div>}{fieldErrors.groupIds && <p className="text-xs text-red-700">{fieldErrors.groupIds}</p>}</fieldset>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4"><Button variant="secondary" onClick={() => void navigate("/admin/assignments")}>Cancel</Button><Button type="submit" disabled={saving || (form.targetType === "SELECTED_GROUPS" && form.groupIds.length === 0) || !form.dueAt}>{saving ? "Saving…" : editing ? "Save changes" : "Create assignment"}</Button></div>
    </form>
  </div>;
}
