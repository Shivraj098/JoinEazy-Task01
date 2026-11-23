import { useState, type SyntheticEvent } from "react";
import { Link, useNavigate } from "react-router";
import { AuthLayout } from "../../components/AuthLayout";
import { Button } from "../../components/Button";
import { FormField } from "../../components/FormField";
import { ApiError, getFieldErrors } from "../../lib/api";
import { useAuth } from "./AuthContext";
import { homePathFor } from "./types";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const user = await login(email, password);
      void navigate(homePathFor(user.role), { replace: true });
    } catch (error) {
      setFieldErrors(getFieldErrors(error));
      setFormError(error instanceof ApiError ? error.message : "Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Use the email and password for your Joineazy account."
      footer={
        <>
          New student?{" "}
          <Link to="/register" className="font-medium text-indigo-700 hover:underline">
            Create an account
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
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
          required
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          required
        />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
        {submitting && (
          <p className="text-center text-xs text-slate-500">
            The first request after a quiet period can take a few seconds.
          </p>
        )}
      </form>
    </AuthLayout>
  );
}
