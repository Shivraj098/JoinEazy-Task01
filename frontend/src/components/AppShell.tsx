import { NavLink, Outlet } from "react-router";
import { useAuth } from "../features/auth/AuthContext";
import { homePathFor } from "../features/auth/types";
import { Button } from "./Button";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`;

export function AppShell() {
  const { user, logout } = useAuth();
  if (!user) return null;
  const navigation = user.role === "ADMIN"
    ? [{ to: homePathFor(user.role), label: "Dashboard", end: true }, { to: "/admin/assignments", label: "Assignments", end: false }]
    : [{ to: homePathFor(user.role), label: "Dashboard", end: true }, { to: "/student/group", label: "My group", end: false }, { to: "/student/assignments", label: "Assignments", end: false }];
  const roleLabel = user.role === "ADMIN" ? "Professor" : "Student";
  const brand = <div className="flex items-center gap-3"><span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-semibold text-white">J</span><span className="font-semibold tracking-tight">Joineazy</span></div>;
  const account = <div className="text-sm"><p className="truncate font-medium">{user.name}</p><p className="text-slate-500">{roleLabel}</p></div>;
  const nav = <nav aria-label="Main" className="flex flex-col gap-1">{navigation.map((item) => <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>{item.label}</NavLink>)}</nav>;
  return <div className="min-h-screen md:flex">
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex">{brand}<div className="mt-8">{nav}</div><div className="mt-auto space-y-3 border-t border-slate-200 pt-4">{account}<Button variant="secondary" className="w-full" onClick={() => void logout()}>Sign out</Button></div></aside>
    <div className="flex min-w-0 flex-1 flex-col"><header className="border-b border-slate-200 bg-white px-4 py-3 md:hidden"><div className="flex items-center justify-between gap-3">{brand}<Button variant="secondary" onClick={() => void logout()}>Sign out</Button></div><div className="mt-3">{nav}</div></header><main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-10"><Outlet /></main></div>
  </div>;
}
