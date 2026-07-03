import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

// ============================
// 🎨 "DEEP ONYX" UI STYLES
// ============================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

  * {
    box-sizing: border-box;
  }

  .hod-wrapper {
    min-height: 100vh;
    font-family: 'Plus Jakarta Sans', sans-serif;
    background-color: #030712; /* Deepest slate/black */
    background-image: 
      linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    background-size: 40px 40px;
    position: relative;
    overflow-x: hidden;
    color: #f8fafc;
    padding-bottom: 60px;
  }

  /* Powerful Electric Glows */
  .hod-wrapper::before, .hod-wrapper::after {
    content: '';
    position: fixed;
    width: 600px;
    height: 600px;
    border-radius: 50%;
    filter: blur(150px);
    z-index: 0;
    pointer-events: none;
  }

  .hod-wrapper::before {
    background: rgba(56, 189, 248, 0.12);
    top: -200px;
    left: -200px;
  }

  .hod-wrapper::after {
    background: rgba(168, 85, 247, 0.12);
    bottom: -200px;
    right: -200px;
  }

  /* Navbar */
  .hod-nav {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(3, 7, 18, 0.8);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding: 20px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .nav-brand {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 22px;
    font-weight: 800;
    color: #fff;
    letter-spacing: 0.5px;
  }

  .brand-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(99, 102, 241, 0.1));
    border: 1px solid rgba(56, 189, 248, 0.3);
    color: #38bdf8;
    box-shadow: 0 0 20px rgba(56, 189, 248, 0.15);
  }

  /* Main Container */
  .hod-container {
    position: relative;
    z-index: 1;
    max-width: 1250px;
    margin: 50px auto 0;
    padding: 0 24px;
  }

  .welcome-banner {
    margin-bottom: 48px;
  }

  .welcome-title {
    font-size: 40px;
    font-weight: 800;
    margin: 0 0 12px 0;
    background: linear-gradient(180deg, #ffffff 0%, #94a3b8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.5px;
  }

  .welcome-subtitle {
    font-size: 16px;
    color: #64748b;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
    letter-spacing: 0.5px;
  }
  
  .dept-badge {
    background: rgba(56, 189, 248, 0.1);
    color: #38bdf8;
    padding: 6px 14px;
    border-radius: 8px;
    border: 1px solid rgba(56, 189, 248, 0.2);
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* Grid Layout */
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: 28px;
  }

  /* Glass Cards */
  .glass-card {
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 28px;
    padding: 36px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.05);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .glass-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 40px 70px -15px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255,255,255,0.05);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }

  .card-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .card-title {
    font-size: 22px;
    font-weight: 700;
    color: #f8fafc;
    margin: 0;
  }

  .card-desc {
    color: #94a3b8;
    font-size: 15px;
    line-height: 1.5;
    margin-bottom: 32px;
    flex: 1;
  }

  /* Buttons */
  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 16px 24px;
    border: none;
    border-radius: 16px;
    font-size: 16px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.3s ease;
    width: 100%;
  }

  .btn:active {
    transform: translateY(2px);
  }

  .btn-primary {
    background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%);
    color: white;
    box-shadow: 0 12px 30px -10px rgba(56, 189, 248, 0.5);
  }
  .btn-primary:hover { 
    box-shadow: 0 20px 40px -10px rgba(56, 189, 248, 0.7); 
    filter: brightness(1.1);
  }

  .btn-success {
    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
    color: white;
    box-shadow: 0 12px 30px -10px rgba(16, 185, 129, 0.5);
  }
  .btn-success:hover { 
    box-shadow: 0 20px 40px -10px rgba(16, 185, 129, 0.7); 
    filter: brightness(1.1);
  }

  .btn-danger {
    background: rgba(239, 68, 68, 0.1);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.2);
    padding: 12px 24px;
    border-radius: 12px;
    width: auto;
  }
  .btn-danger:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
    color: #fca5a5;
  }

  /* Grid for Year Buttons */
  .year-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .btn-outline {
    background: rgba(0, 0, 0, 0.3);
    color: #cbd5e1;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  .btn-outline:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
    border-color: rgba(56, 189, 248, 0.4);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
  }
`;

function HODDashboard() {
  const navigate = useNavigate();

  // Safely parse user from local storage
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (!user || user.role !== "hod") {
      alert("Access Denied: HODs Only");
      navigate("/");
    }
  }, [user, navigate]);

  // ============================
  // SUBJECT SETUP
  // ============================
  const handleSelect = (year) => {
    navigate(`/subjects/${year}`, {
      state: { department: user?.department }
    });
  };

  // ============================
  // GENERATE PAGE
  // ============================
  const handleGenerate = () => {
    navigate("/generate");
  };

  // ============================
  // VIEW TIMETABLE (CLASS-WISE)
  // ============================
  const handleView = async (year) => {
    if (!user?.department) {
      alert("Error: Department not found for current user.");
      return;
    }

    const docId = `${user.department}_${year}`;

    try {
      const docRef = doc(db, "timetables", docId);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        alert(`❌ No timetable found for ${year} Year. Generate it first.`);
        return;
      }

      navigate(`/view/${encodeURIComponent(docId)}`);
    } catch (err) {
      console.error(err);
      alert("Error loading timetable");
    }
  };

  // ============================
  // VIEW PERSONAL TIMETABLE
  // ============================
  const handleMyTimetable = () => {
    navigate("/dashboard"); // reuse faculty dashboard
  };

  // ============================
  // LOGOUT
  // ============================
  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("user");
      navigate("/");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <>
      <style>{styles}</style>

      <div className="hod-wrapper">
        
        {/* Top Navbar */}
        <nav className="hod-nav">
          <div className="nav-brand">
            <div className="brand-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            Admin Workspace
          </div>
          <button className="btn btn-danger" onClick={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sign Out
          </button>
        </nav>

        {/* Main Content */}
        <div className="hod-container">
          
          <div className="welcome-banner">
            <h1 className="welcome-title">Overview Dashboard</h1>
            <div className="welcome-subtitle">
              Welcome back, {user?.name || "Admin"} • Managing <span className="dept-badge">{user?.department || "N/A"}</span>
            </div>
          </div>

          <div className="dashboard-grid">

            {/* CARD 1: My Schedule */}
            <div className="glass-card">
              <div className="card-header">
                <div className="card-icon" style={{ color: "#38bdf8" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <h3 className="card-title">My Schedule</h3>
              </div>
              <p className="card-desc">
                Access your personal teaching load, assigned classes, and weekly lecture schedule.
              </p>
              <button className="btn btn-primary" onClick={handleMyTimetable}>
                View My Timetable
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>
              </button>
            </div>

            {/* CARD 2: Subject Setup */}
            <div className="glass-card">
              <div className="card-header">
                <div className="card-icon" style={{ color: "#f472b6" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <h3 className="card-title">Course Allocation</h3>
              </div>
              <p className="card-desc">
                Assign faculty members, map subjects to specific rooms, and manage batches for each academic year.
              </p>
              <div className="year-grid">
                <button className="btn btn-outline" onClick={() => handleSelect("1st")}>1st Year</button>
                <button className="btn btn-outline" onClick={() => handleSelect("2nd")}>2nd Year</button>
                <button className="btn btn-outline" onClick={() => handleSelect("3rd")}>3rd Year</button>
                <button className="btn btn-outline" onClick={() => handleSelect("4th")}>4th Year</button>
              </div>
            </div>

            {/* CARD 3: Generate Engine */}
            <div className="glass-card">
              <div className="card-header">
                <div className="card-icon" style={{ color: "#34d399" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                </div>
                <h3 className="card-title">AI Engine</h3>
              </div>
              <p className="card-desc">
                Launch the generation engine to automatically construct optimal, clash-free timetables for your department.
              </p>
              <button className="btn btn-success" onClick={handleGenerate}>
                Generate Timetables
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>
              </button>
            </div>

            {/* CARD 4: View Finalized */}
            <div className="glass-card">
              <div className="card-header">
                <div className="card-icon" style={{ color: "#fbbf24" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </div>
                <h3 className="card-title">Published Schedules</h3>
              </div>
              <p className="card-desc">
                View generated timetables, manually drag-and-drop to resolve constraints, and download PDFs.
              </p>
              <div className="year-grid">
                <button className="btn btn-outline" onClick={() => handleView("1st")}>View 1st</button>
                <button className="btn btn-outline" onClick={() => handleView("2nd")}>View 2nd</button>
                <button className="btn btn-outline" onClick={() => handleView("3rd")}>View 3rd</button>
                <button className="btn btn-outline" onClick={() => handleView("4th")}>View 4th</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

export default HODDashboard;