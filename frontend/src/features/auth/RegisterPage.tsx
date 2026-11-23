import { useState, type SyntheticEvent } from "react";
import { Link, useNavigate } from "react-router";
import { AuthLayout } from "../../components/AuthLayout";
import { Button } from "../../components/Button";
import { FormField } from "../../components/FormField";
import { ApiError, getFieldErrors } from "../../lib/api";
import { useAuth } from "./AuthContext";
import { homePathFor } from "./types";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", studentId: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const update = (field: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const user = await register(form);
      void navigate(homePathFor(user.role), { replace: true });
    } catch (error) {
      const fields = getFieldErrors(error);
      setFieldErrors(fields);
      setFormError(
        Object.keys(fields).length > 0
          ? null
          : error instanceof ApiError
            ? error.message
            : "Something went wrong. Try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Register as a student to join a group and confirm submissions."
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-medium text-indigo-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={(event) => void handleSubmit(event)} noValidate className="space-y-4">
        {formError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {formError}
          </p>
        )}
        <FormField
          label="Full name"
          autoComplete="name"
          value={form.name}
          onChange={update("name")}
          error={fieldErrors.name}
          required
        />
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={update("email")}
          error={fieldErrors.email}
          required
        />
        <FormField
          label="Official Student ID"
          value={form.studentId}
          onChange={update("studentId")}
          error={fieldErrors.studentId}
          hint="Enter the student ID issued by your institution. Group leaders use it to add you."
          maxLength={64}
          required
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={update("password")}
          error={fieldErrors.password}
          hint="At least 8 characters."
          required
        />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
