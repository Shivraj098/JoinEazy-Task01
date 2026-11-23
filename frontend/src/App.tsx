import { Link, Route, Routes } from "react-router";
import { AppShell } from "./components/AppShell";
import AdminAssignmentFormPage from "./features/assignments/AdminAssignmentFormPage";
import AdminAssignmentsPage from "./features/assignments/AdminAssignmentsPage";
import StudentAssignmentDetailPage from "./features/assignments/StudentAssignmentDetailPage";
import StudentAssignmentsPage from "./features/assignments/StudentAssignmentsPage";
import { GuestOnly, HomeRedirect, RequireRole } from "./features/auth/guards";
import LoginPage from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";
import AdminDashboardPage from "./features/dashboard/AdminDashboardPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import GroupPage from "./features/groups/GroupPage";

function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-slate-600">The page you are looking for does not exist.</p>
      <Link to="/" className="mt-4 font-medium text-indigo-700 hover:underline">
        Go to the home page
      </Link>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<RequireRole role="STUDENT"><AppShell /></RequireRole>}>
        <Route path="/student" element={<DashboardPage />} />
        <Route path="/student/group" element={<GroupPage />} />
        <Route path="/student/assignments" element={<StudentAssignmentsPage />} />
        <Route path="/student/assignments/:assignmentId" element={<StudentAssignmentDetailPage />} />
      </Route>
      <Route element={<RequireRole role="ADMIN"><AppShell /></RequireRole>}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/assignments" element={<AdminAssignmentsPage />} />
        <Route path="/admin/assignments/new" element={<AdminAssignmentFormPage />} />
        <Route path="/admin/assignments/:assignmentId/edit" element={<AdminAssignmentFormPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
