import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "./lib/api";

type Status = { state: "checking" } | { state: "ready" } | { state: "error"; message: string };

function useServiceStatus() {
  const [status, setStatus] = useState<Status>({ state: "checking" });

  const check = useCallback(async () => {
    setStatus({ state: "checking" });
    try {
      await api.get<{ status: string }>("/health/ready");
      setStatus({ state: "ready" });
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not reach the server. Try again.";
      setStatus({ state: "error", message });
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  return { status, check };
}

export default function App() {
  const { status, check } = useServiceStatus();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-lg font-semibold text-white">
          J
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Joineazy</h1>
          <p className="text-sm text-slate-600">Groups, assignments and submissions</p>
        </div>
      </div>

      <section
        aria-live="polite"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-sm font-medium text-slate-500">Service status</h2>

        {status.state === "checking" && (
          <p className="mt-2 text-slate-700">Checking connection to the server…</p>
        )}

        {status.state === "ready" && (
          <p className="mt-2 flex items-center gap-2 font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden="true" />
            Server and database are reachable
          </p>
        )}

        {status.state === "error" && (
          <div className="mt-2">
            <p className="flex items-center gap-2 font-medium text-red-700">
              <span className="h-2 w-2 rounded-full bg-red-600" aria-hidden="true" />
              {status.message}
            </p>
            <button
              type="button"
              onClick={() => void check()}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Try again
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
