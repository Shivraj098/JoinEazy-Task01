import { Link, NavLink, Outlet } from "react-router";
import { useAuth } from "../features/auth/AuthContext";
import { homePathFor } from "../features/auth/types";
import { Button } from "./Button";

interface NavigationItem {
  to: string;
  label: string;
  end?: boolean;
}

const activeLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
    isActive
      ? "bg-indigo-50 text-indigo-700"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

function Brand({ homePath }: { homePath: string }) {
  return (
    <Link
      to={homePath}
      aria-label="Joineazy home"
      className="inline-flex items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-semibold text-white"
      >
        J
      </span>
      <span className="font-semibold tracking-tight text-slate-900">Joineazy</span>
    </Link>
  );
}

function AccountSummary({ name, roleLabel }: { name: string; roleLabel: string }) {
  return (
    <div className="min-w-0 text-sm">
      <p className="truncate font-medium text-slate-900">{name}</p>
      <p className="text-slate-500">{roleLabel}</p>
    </div>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const homePath = homePathFor(user.role);
  const roleLabel = user.role === "ADMIN" ? "Professor" : "Student";
  const navigation: NavigationItem[] =
    user.role === "ADMIN"
      ? [
          { to: homePath, label: "Dashboard", end: true },
          { to: "/admin/assignments", label: "Assignments" },
        ]
      : [
          { to: homePath, label: "Dashboard", end: true },
          { to: "/student/group", label: "My group" },
          { to: "/student/assignments", label: "Assignments" },
        ];

  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-white px-4 py-2 font-medium text-indigo-700 shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>
      <div className="min-h-screen bg-slate-50 md:flex">
        <aside
          aria-label="Sidebar"
          className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex"
        >
          <Brand homePath={homePath} />
          <nav aria-label="Primary navigation" className="mt-8 flex flex-col gap-1">
            {navigation.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={activeLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto space-y-3 border-t border-slate-200 pt-4">
            <AccountSummary name={user.name} roleLabel={roleLabel} />
            <Button variant="secondary" className="w-full" onClick={() => void logout()}>
              Sign out
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white px-4 py-3 md:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Brand homePath={homePath} />
              <Button variant="secondary" onClick={() => void logout()}>
                Sign out
              </Button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <AccountSummary name={user.name} roleLabel={roleLabel} />
            </div>
            <nav aria-label="Primary navigation" className="mt-3 flex flex-wrap gap-1">
              {navigation.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={activeLinkClass}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </header>

          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 outline-none md:px-8 md:py-10"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}
