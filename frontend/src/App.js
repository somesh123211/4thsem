import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import HODDashboard from "./pages/HODDashboard";
import SubjectPage from "./pages/SubjectPage";
import GenerateTimetable from "./pages/GenerateTimetable";
import ViewTimetable from "./pages/ViewTimetable";
import AdminPage from "./pages/AdminPage";
import CustomAlertProvider from "./components/CustomAlertProvider";

// ✅ Route guard — only allows admin role through
function ProtectedAdminRoute() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return <AdminPage />;
}

function App() {
  return (
    <CustomAlertProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/hod-dashboard" element={<HODDashboard />} />
          <Route path="/subjects/:year" element={<SubjectPage />} />
          <Route path="/generate" element={<GenerateTimetable />} />
          <Route path="/view/:id" element={<ViewTimetable />} />
          <Route path="/admin" element={<ProtectedAdminRoute />} />
        </Routes>
      </Router>
    </CustomAlertProvider>
  );
}

export default App;