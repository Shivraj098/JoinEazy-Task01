import type { ReactNode } from "react";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-lg font-semibold text-white"
        >
          J
        </span>
        <span className="text-lg font-semibold tracking-tight">Joineazy</span>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </section>

      <p className="mt-4 text-center text-sm text-slate-600">{footer}</p>
    </main>
  );
}
