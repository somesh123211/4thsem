import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseConfig, db, logActivity } from "../firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  getDoc, 
  addDoc 
} from "firebase/firestore";

// Initialize secondary auth safely
let secondaryAuth;
try {
  const secondaryApp = getApps().find(app => app.name === "Secondary") || initializeApp(firebaseConfig, "Secondary");
  secondaryAuth = getAuth(secondaryApp);
} catch (e) {
  console.error("Secondary app init error:", e);
}

const styles = `
  .admin-container {
    min-height: 100vh;
    background-color: #fafafa;
    color: #262626;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    display: flex;
  }
  .admin-sidebar {
    width: 250px;
    background-color: #ffffff;
    border-right: 1px solid #dbdbdb;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .admin-sidebar h2 {
    font-size: 19px;
    font-weight: 700;
    margin: 0 0 20px 0;
    color: #262626;
    border-bottom: 1px solid #dbdbdb;
    padding-bottom: 16px;
    letter-spacing: 0.5px;
  }
  .admin-sidebar button {
    background: none;
    border: none;
    color: #737373;
    padding: 10px 14px;
    text-align: left;
    font-size: 14px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
  }
  .admin-sidebar button.active {
    background-color: #f2f2f2;
    color: #262626;
    font-weight: 700;
  }
  .admin-sidebar button:hover {
    background-color: #fafafa;
    color: #262626;
  }
  .admin-content {
    flex: 1;
    padding: 40px;
    overflow-y: auto;
  }
  .admin-section-title {
    font-size: 24px;
    font-weight: 700;
    color: #262626;
    margin: 0 0 24px 0;
    border-bottom: 1px solid #dbdbdb;
    padding-bottom: 12px;
  }
  .admin-card {
    background-color: #ffffff;
    border: 1px solid #dbdbdb;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  .admin-card h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 700;
    color: #262626;
  }
  .admin-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 16px;
    font-size: 14px;
    color: #262626;
  }
  .admin-table th, .admin-table td {
    border: 1px solid #dbdbdb;
    padding: 12px;
    text-align: left;
  }
  .admin-table th {
    background-color: #fafafa;
    color: #737373;
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .admin-table tr:nth-child(even) {
    background-color: #fafafa;
  }
  .admin-form-group {
    margin-bottom: 16px;
    max-width: 400px;
  }
  .admin-form-group label {
    display: block;
    margin-bottom: 6px;
    font-weight: 600;
    font-size: 13px;
    color: #262626;
  }
  .admin-input, .admin-select {
    width: 100%;
    padding: 10px 12px;
    background-color: #ffffff;
    border: 1px solid #dbdbdb;
    color: #262626;
    border-radius: 6px;
    font-family: inherit;
    font-size: 14px;
    transition: border-color 0.2s;
  }
  .admin-input:focus, .admin-select:focus {
    outline: none;
    border-color: #0095f6;
  }
  .admin-btn {
    background-color: #0095f6;
    color: #ffffff;
    border: none;
    padding: 10px 18px;
    font-weight: 600;
    cursor: pointer;
    border-radius: 8px;
    font-family: inherit;
    font-size: 14px;
    transition: opacity 0.2s;
  }
  .admin-btn:hover {
    opacity: 0.9;
  }
  .admin-btn-danger {
    background-color: #ed4956;
    color: #ffffff;
  }
  .dept-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #e2e8f0;
  }
  .log-timestamp {
    color: #8e8e8e;
    font-size: 13px;
  }
  .log-email {
    font-weight: 600;
    color: #262626;
  }
`;

function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("users");

  // Auth Protection
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user || user.role !== "admin") {
      alert("Access Denied: Admins Only");
      navigate("/");
    }
  }, [navigate]);

  // Dropdown list
  const departments = [
    "Civil Engineering",
    "Computer Science and Engineering",
    "Electronics & Telecommunication",
    "Electrical Engineering",
    "Information Technology",
    "Mechanical Engineering",
    "Artificial Intelligence",
    "Computer Science & Engineering (Data Science)",
    "Industrial IOT",
    "Computer Science & Engineering (Cyber Security)",
    "Computer Science and Business Systems(TCS)",
    "Robotics and Artificial Intelligence",
    "1st year (ALL BRANCHES)"
  ];

  // ==========================================
  // TAB 1: USERS STATES & LOGIC (WITH SEARCH FILTER)
  // ==========================================
  const [users, setUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserDept, setNewUserDept] = useState("");
  const [newUserRole, setNewUserRole] = useState("faculty");

  const loadUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(items);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserPassword || !newUserDept || !newUserRole) {
      alert("Please fill all fields for user creation.");
      return;
    }
    if (!secondaryAuth) {
      alert("Error: Secondary Auth instance not initialized.");
      return;
    }

    try {
      // 1. Create in Firebase auth (via secondary app)
      const cred = await createUserWithEmailAndPassword(secondaryAuth, newUserEmail, newUserPassword);
      const uid = cred.user.uid;

      // 2. Save in Firestore users collection
      await setDoc(doc(db, "users", uid), {
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        department: newUserDept,
        role: newUserRole
      });

      await logActivity(
        "someshninawe61@gmail.com",
        "Admin Create User",
        `Created user ${newUserName} (${newUserRole}) for dept ${newUserDept}`
      );

      alert("User registered successfully!");
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      loadUsers();
    } catch (err) {
      console.error(err);
      alert("Failed to create user: " + err.message);
    }
  };

  const handleDeleteUser = async (uid, userName, userEmail) => {
    if (!window.confirm(`Are you sure you want to delete user ${userName}?`)) return;
    try {
      await deleteDoc(doc(db, "users", uid));
      await logActivity(
        "someshninawe61@gmail.com",
        "Admin Delete User",
        `Deleted user ${userName} (${userEmail})`
      );
      alert("User deleted from database successfully.");
      loadUsers();
    } catch (err) {
      console.error(err);
      alert("Failed to delete user doc: " + err.message);
    }
  };

  const handleCleanHODAccounts = async () => {
    const confirmClean = window.confirm("Are you sure you want to delete all legacy HOD accounts (emails starting with 'hod') from Firestore users database?");
    if (!confirmClean) return;

    try {
      const snap = await getDocs(collection(db, "users"));
      let count = 0;
      for (let d of snap.docs) {
        const u = d.data();
        if (u.email && u.email.toLowerCase().startsWith("hod")) {
          await deleteDoc(doc(db, "users", d.id));
          await logActivity(
            "someshninawe61@gmail.com",
            "Admin Delete Legacy HOD",
            `Deleted legacy HOD account: ${u.name} (${u.email})`
          );
          count++;
        }
      }
      alert(`Successfully deleted ${count} legacy HOD accounts!`);
      loadUsers();
    } catch (err) {
      console.error(err);
      alert("Error cleaning HOD accounts: " + err.message);
    }
  };

  // Filtered users calculation
  const filteredUsers = users.filter(u => {
    const q = userSearchQuery.toLowerCase();
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q) ||
      (u.department || "").toLowerCase().includes(q)
    );
  });

  // ==========================================
  // TAB 2: ROOMS STATES & LOGIC (WITH DUPLICATE CHECK)
  // ==========================================
  const [rooms, setRooms] = useState([]);
  const [roomSearchQuery, setRoomSearchQuery] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomType, setNewRoomType] = useState("classroom");

  const filteredRooms = rooms.filter(r => {
    const q = roomSearchQuery.toLowerCase();
    return (
      (r.name || "").toLowerCase().includes(q) ||
      (r.type || "").toLowerCase().includes(q)
    );
  });

  const loadRooms = async () => {
    try {
      const snap = await getDocs(collection(db, "rooms"));
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRooms(items);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName || !newRoomType) {
      alert("Fill room details.");
      return;
    }

    // 🚫 Prevent duplicate rooms
    const isDuplicate = rooms.some(r => r.name.trim().toLowerCase() === newRoomName.trim().toLowerCase());
    if (isDuplicate) {
      alert(`Error: A room with the identifier "${newRoomName}" already exists!`);
      return;
    }

    try {
      await addDoc(collection(db, "rooms"), {
        name: newRoomName,
        type: newRoomType
      });
      await logActivity(
        "someshninawe61@gmail.com",
        "Admin Add Room",
        `Added room ${newRoomName} of type ${newRoomType}`
      );
      alert("Room added successfully!");
      setNewRoomName("");
      loadRooms();
    } catch (err) {
      console.error(err);
      alert("Error adding room: " + err.message);
    }
  };

  const handleDeleteRoom = async (id, roomName) => {
    if (!window.confirm(`Delete room ${roomName}?`)) return;
    try {
      await deleteDoc(doc(db, "rooms", id));
      await logActivity(
        "someshninawe61@gmail.com",
        "Admin Delete Room",
        `Deleted room ${roomName}`
      );
      alert("Room deleted!");
      loadRooms();
    } catch (err) {
      console.error(err);
      alert("Error deleting room");
    }
  };

  // ==========================================
  // TAB 3: TIMETABLES STATES & LOGIC
  // ==========================================
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const handleViewTimetable = async () => {
    if (!selectedDept || !selectedYear) {
      alert("Please select both department and year.");
      return;
    }
    const docId = `${selectedDept}_${selectedYear}`;
    try {
      const docRef = doc(db, "timetables", docId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        alert(`No saved timetable found for ${selectedDept} (${selectedYear} Year).`);
        return;
      }
      navigate(`/view/${encodeURIComponent(docId)}`);
    } catch (e) {
      console.error(e);
      alert("Error checking timetable document.");
    }
  };

  // ==========================================
  // TAB 4: SYSTEM LOGS STATE & LOGIC
  // ==========================================
  const [logs, setLogs] = useState([]);

  const loadLogs = async () => {
    try {
      const snap = await getDocs(collection(db, "system_logs"));
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort descending by timestamp
      items.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      setLogs(items);
    } catch (e) {
      console.error(e);
    }
  };

  // Load appropriate data when tab changes
  useEffect(() => {
    if (activeTab === "users") loadUsers();
    if (activeTab === "rooms") loadRooms();
    if (activeTab === "logs") loadLogs();
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <>
      <style>{styles}</style>
      <div className="admin-container">
        
        {/* Sidebar */}
        <div className="admin-sidebar">
          <h2>SYS_ADMIN PORTAL</h2>
          <button 
            className={activeTab === "users" ? "active" : ""} 
            onClick={() => setActiveTab("users")}
          >
            Users Allocation
          </button>
          <button 
            className={activeTab === "rooms" ? "active" : ""} 
            onClick={() => setActiveTab("rooms")}
          >
            Rooms Setup
          </button>
          <button 
            className={activeTab === "timetables" ? "active" : ""} 
            onClick={() => setActiveTab("timetables")}
          >
            View Timetables
          </button>
          <button 
            className={activeTab === "logs" ? "active" : ""} 
            onClick={() => setActiveTab("logs")}
          >
            Logs & Activity
          </button>
          <button 
            onClick={handleLogout} 
            style={{ marginTop: "auto", color: "#ed4956", borderTop: "1px solid #dbdbdb", paddingTop: "15px", fontWeight: "600" }}
          >
            Log Out
          </button>
        </div>

        {/* Content Area */}
        <div className="admin-content">

          {/* TAB 1: USERS SECTION */}
          {activeTab === "users" && (
            <div>
              <h1 className="admin-section-title">System User Accounts</h1>
              
              {/* Form Card */}
              <div className="admin-card">
                <h3>Add New HOD or Faculty Member</h3>
                <form onSubmit={handleAddUser} style={{ marginTop: "16px" }}>
                  <div className="admin-form-group">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      className="admin-input" 
                      placeholder="e.g. Prof. Dinesh" 
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      className="admin-input" 
                      placeholder="teacher@univ.edu" 
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Initial Password</label>
                    <input 
                      type="text" 
                      className="admin-input" 
                      placeholder="Password@123" 
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Department Selection</label>
                    <select 
                      className="admin-select"
                      value={newUserDept}
                      onChange={(e) => setNewUserDept(e.target.value)}
                    >
                      <option value="">-- Choose Dept --</option>
                      {departments.map((d, i) => (
                        <option key={i} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>Account Role</label>
                    <select 
                      className="admin-select"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                    >
                      <option value="faculty">Faculty Member</option>
                      <option value="hod">HOD (Department Admin)</option>
                    </select>
                  </div>
                  <button type="submit" className="admin-btn">Create User Profile</button>
                </form>
              </div>

              {/* Data Table */}
              <div className="admin-card" style={{ overflowX: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0 }}>All Active Database Users</h3>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <button
                      className="admin-btn admin-btn-danger"
                      style={{ padding: "8px 14px", fontSize: "13px" }}
                      onClick={handleCleanHODAccounts}
                    >
                      🧹 Purge Legacy HODs
                    </button>
                    <input
                      type="text"
                      className="admin-input"
                      style={{ width: "260px", margin: 0 }}
                      placeholder="🔍 Search user name, email, dept..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User Name</th>
                      <th>Email ID</th>
                      <th>Password</th>
                      <th>Role</th>
                      <th>Department</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: "bold" }}>{u.name}</td>
                        <td>{u.email}</td>
                        <td style={{ fontFamily: "monospace", color: "#0095f6", fontWeight: "600" }}>{u.password || "N/A"}</td>
                        <td>
                          <span style={{ 
                            padding: "4px 8px", 
                            borderRadius: "4px", 
                            fontSize: "11px",
                            fontWeight: "600",
                            backgroundColor: u.role === "hod" ? "#fde8e8" : "#e1f5fe", 
                            color: u.role === "hod" ? "#e53e3e" : "#0288d1"
                          }}>
                            {u.role ? u.role.toUpperCase() : "FACULTY"}
                          </span>
                        </td>
                        <td><span className="dept-badge">{u.department || "N/A"}</span></td>
                        <td>
                          <button 
                            className="admin-btn admin-btn-danger" 
                            style={{ padding: "6px 12px" }}
                            onClick={() => handleDeleteUser(u.id, u.name, u.email)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ROOMS SECTION */}
          {activeTab === "rooms" && (
            <div>
              <h1 className="admin-section-title">Rooms Infrastructure Allocation</h1>
              
              <div className="admin-card">
                <h3>Register Infrastructure Space</h3>
                <form onSubmit={handleAddRoom} style={{ marginTop: "16px", display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div className="admin-form-group" style={{ margin: 0, minWidth: "200px" }}>
                    <label>Room Identifier</label>
                    <input 
                      type="text" 
                      className="admin-input" 
                      placeholder="e.g. BS04 or BS17A" 
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                    />
                  </div>
                  <div className="admin-form-group" style={{ margin: 0, minWidth: "200px" }}>
                    <label>Infrastructure Type</label>
                    <select 
                      className="admin-select"
                      value={newRoomType}
                      onChange={(e) => setNewRoomType(e.target.value)}
                    >
                      <option value="classroom">Classroom (Theory)</option>
                      <option value="lab">Lab Space (Practical)</option>
                    </select>
                  </div>
                  <button type="submit" className="admin-btn" style={{ height: "40px" }}>Add Room</button>
                </form>
              </div>

              <div className="admin-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0 }}>Registered Space Items</h3>
                  <input
                    type="text"
                    className="admin-input"
                    style={{ width: "260px", margin: 0 }}
                    placeholder="🔍 Search rooms..."
                    value={roomSearchQuery}
                    onChange={(e) => setRoomSearchQuery(e.target.value)}
                  />
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Room ID</th>
                      <th>Room type</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRooms.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: "bold" }}>{r.name}</td>
                        <td>
                          <span style={{ 
                            padding: "4px 8px", 
                            borderRadius: "4px", 
                            fontSize: "11px",
                            fontWeight: "600",
                            backgroundColor: r.type === "lab" ? "#f3e8ff" : "#f1f5f9",
                            color: r.type === "lab" ? "#7e22ce" : "#475569"
                          }}>
                            {r.type ? r.type.toUpperCase() : "CLASSROOM"}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="admin-btn admin-btn-danger" 
                            style={{ padding: "6px 12px" }}
                            onClick={() => handleDeleteRoom(r.id, r.name)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: VIEW TIMETABLES */}
          {activeTab === "timetables" && (
            <div>
              <h1 className="admin-section-title">Class-wise Timetable Viewer</h1>
              <div className="admin-card" style={{ maxWidth: "500px" }}>
                <h3>Query Saved Timetable documents</h3>
                <div style={{ marginTop: "20px" }}>
                  <div className="admin-form-group">
                    <label>Academic Department</label>
                    <select 
                      className="admin-select"
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                    >
                      <option value="">-- Choose Dept --</option>
                      {departments.map((d, i) => (
                        <option key={i} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>Academic Year</label>
                    <select 
                      className="admin-select"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                    >
                      <option value="">-- Select Year --</option>
                      <option value="1st">1st Year</option>
                      <option value="2nd">2nd Year</option>
                      <option value="3rd">3rd Year</option>
                      <option value="4th">4th Year</option>
                    </select>
                  </div>
                  <button 
                    className="admin-btn" 
                    style={{ marginTop: "10px", width: "100%" }}
                    onClick={handleViewTimetable}
                  >
                    Open Timetable Grid Viewer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM LOGS */}
          {activeTab === "logs" && (
            <div>
              <h1 className="admin-section-title">System Action logs & Audit Trail</h1>
              <div className="admin-card" style={{ overflowX: "auto" }}>
                <h3>Logs Trail (Sorted Descending)</h3>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: "200px" }}>Timestamp</th>
                      <th style={{ width: "220px" }}>Operator Email</th>
                      <th style={{ width: "180px" }}>Action type</th>
                      <th>Activity details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(l => (
                      <tr key={l.id}>
                        <td className="log-timestamp">{new Date(l.timestamp).toLocaleString()}</td>
                        <td className="log-email">{l.email}</td>
                        <td style={{ color: "#262626", fontWeight: "500" }}>{l.action}</td>
                        <td style={{ color: "#737373" }}>{l.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default AdminPage;
