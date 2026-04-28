import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import HODDashboard from "./pages/HODDashboard";
import SubjectPage from "./pages/SubjectPage";
import GenerateTimetable from "./pages/GenerateTimetable";
import ViewTimetable from "./pages/ViewTimetable";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/hod-dashboard" element={<HODDashboard />} />
        <Route path="/subjects/:year" element={<SubjectPage />} />
        <Route path="/generate" element={<GenerateTimetable />} />
        <Route path="/view/:id" element={<ViewTimetable />} />
        
      </Routes>
    </Router>
  );
}

export default App;