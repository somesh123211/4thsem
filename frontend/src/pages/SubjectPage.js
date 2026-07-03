import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "firebase/firestore";
import { db, logActivity } from "../firebase";

// ============================
// 🎨 "DEEP ONYX" UI STYLES
// ============================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

  * { box-sizing: border-box; }

  .setup-wrapper {
    min-height: 100vh;
    font-family: 'Plus Jakarta Sans', sans-serif;
    background-color: #030712;
    background-image: 
      linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    background-size: 40px 40px;
    padding: 40px 20px;
    position: relative;
    color: #f8fafc;
  }

  .setup-wrapper::before, .setup-wrapper::after {
    content: '';
    position: fixed;
    width: 600px;
    height: 600px;
    border-radius: 50%;
    filter: blur(150px);
    z-index: 0;
    pointer-events: none;
  }
  .setup-wrapper::before { background: rgba(56, 189, 248, 0.1); top: -200px; left: -200px; }
  .setup-wrapper::after { background: rgba(168, 85, 247, 0.1); bottom: -200px; right: -200px; }

  .setup-inner {
    position: relative;
    z-index: 1;
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  /* Glass Cards */
  .glass-card {
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 24px;
    padding: 32px;
    box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.05);
  }

  .header-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
  }

  .title-main {
    font-size: 32px;
    font-weight: 800;
    margin: 0 0 8px 0;
    background: linear-gradient(180deg, #ffffff 0%, #94a3b8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .subtitle {
    font-size: 15px;
    color: #64748b;
    margin: 0;
    font-weight: 500;
    letter-spacing: 0.5px;
  }

  /* Guidelines Panel */
  .guidelines-panel {
    background: rgba(56, 189, 248, 0.05);
    border: 1px solid rgba(56, 189, 248, 0.2);
    border-radius: 16px;
    padding: 24px;
  }

  .guidelines-panel h3 {
    margin: 0 0 12px 0;
    color: #38bdf8;
    font-size: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .guidelines-panel ul {
    margin: 0;
    padding-left: 20px;
    color: #cbd5e1;
    font-size: 14px;
    line-height: 1.6;
  }

  .guidelines-panel li {
    margin-bottom: 6px;
  }
  .guidelines-panel li:last-child { margin-bottom: 0; }

  /* Setup Form (Step 1) */
  .setup-form {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
  }

  /* Data Table */
  .table-container {
    overflow-x: auto;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(0, 0, 0, 0.3);
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
  }

  .data-table th {
    background: rgba(15, 23, 42, 0.9);
    color: #94a3b8;
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    border-right: 1px solid rgba(255, 255, 255, 0.02);
    white-space: nowrap;
  }

  .data-table td {
    padding: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    border-right: 1px solid rgba(255, 255, 255, 0.03);
    background: rgba(15, 23, 42, 0.4);
  }

  /* Inputs & Selects inside Grid */
  .grid-input, .grid-select, .setup-input {
    width: 100%;
    padding: 10px 14px;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    color: #f8fafc;
    font-size: 14px;
    font-family: inherit;
    transition: all 0.3s ease;
  }
  
  .setup-input {
    width: auto;
    min-width: 200px;
  }

  .grid-input:focus, .grid-select:focus, .setup-input:focus {
    outline: none;
    border-color: #38bdf8;
    background: rgba(0, 0, 0, 0.6);
  }

  .grid-input:disabled, .grid-select:disabled {
    background: transparent;
    border-color: transparent;
    color: #cbd5e1;
    cursor: not-allowed;
    appearance: none;
    -webkit-appearance: none;
  }

  .grid-select option {
    background: #0f172a;
    color: #fff;
  }

  /* Real-time Total Hours Box */
  .bottom-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 24px;
    flex-wrap: wrap;
    gap: 20px;
  }

  .total-box {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 24px;
    border-radius: 16px;
    background: rgba(0, 0, 0, 0.4);
    font-size: 16px;
    font-weight: 600;
    color: #cbd5e1;
    border: 2px solid;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
  }

  .total-num {
    font-size: 24px;
    font-weight: 800;
  }

  /* Buttons */
  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .btn:active { transform: translateY(2px); }

  .btn-primary {
    background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%);
    color: white;
    box-shadow: 0 10px 20px -5px rgba(56, 189, 248, 0.4);
  }
  .btn-primary:hover:not(:disabled) {
    box-shadow: 0 15px 30px -5px rgba(56, 189, 248, 0.6);
    filter: brightness(1.1);
  }

  .btn-success {
    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
    color: white;
    box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.4);
  }
  .btn-success:hover {
    box-shadow: 0 15px 30px -5px rgba(16, 185, 129, 0.6);
    filter: brightness(1.1);
  }

  .btn-danger {
    background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
    color: white;
    box-shadow: 0 10px 20px -5px rgba(239, 68, 68, 0.4);
  }
  .btn-danger:hover:not(:disabled) {
    box-shadow: 0 15px 30px -5px rgba(239, 68, 68, 0.6);
    filter: brightness(1.1);
  }

  .btn-outline {
    background: rgba(255, 255, 255, 0.05);
    color: #e2e8f0;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .btn-outline:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

function SubjectPage() {
  // ================== ROUTE PARAM ==================
  const { year } = useParams();

  // ================== BASIC STATES ==================
  const [numSubjects, setNumSubjects] = useState(0);
  const [students, setStudents] = useState("");
  const [batches, setBatches] = useState("");
  const [showGrid, setShowGrid] = useState(false);

  // ================== MAIN DATA ==================
  const [subjects, setSubjects] = useState([]);

  // ================== DROPDOWNS ==================
  const [facultyList, setFacultyList] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [rooms, setRooms] = useState([]);

  // ================== LOCK STATE ==================
  const [isLocked, setIsLocked] = useState(true);

  const navigate = useNavigate();

  // ================== USER ==================
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const dept = user?.department;

  useEffect(() => {
    if (!user || user.role !== "hod") {
      alert("Access Denied: HODs Only");
      navigate("/");
    }
  }, [user, navigate]);

  // ============================================================
  // 🔥 FETCH USERS + ROOMS 
  // ============================================================
  useEffect(() => {
    const fetchData = async () => {
      const usersSnap = await getDocs(collection(db, "users"));
      const roomSnap = await getDocs(collection(db, "rooms"));

      const users = usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setAllUsers(users);

      // SAME DEPT FACULTY
      const filteredFaculty = users.filter(
        u =>
          u.role === "faculty" &&
          u.department?.toLowerCase() === dept?.toLowerCase()
      );

      setFacultyList(filteredFaculty);

      // ROOMS
      const roomsData = roomSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setRooms(roomsData);
    };

    if (dept) fetchData();
  }, [dept]);

  // ============================================================
  // 🔥 LOAD SUBJECTS FROM DATABASE
  // ============================================================
  const fetchSubjects = async () => {
    const snapshot = await getDocs(collection(db, "subjects"));

    const data = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(s => s.dept === dept && s.year === year);

    if (data.length > 0) {
      const formatted = data.map(d => ({
        id: d.id,
        name: d.subject_name || "",
        code: d.subject_code || "",
        faculty: d.faculty_id || "",
        otherDept: d.other_department || "",
        otherFaculty: d.other_faculty_id || "",
        type: d.type || "theory",
        room: d.room || "",
        batchRequired: d.batch_required || "no",
        hours: String(d.hours || "")
      }));

      setSubjects(formatted);
      setShowGrid(true);
      setStudents(data[0].students);
      setBatches(data[0].batches);
    } else {
      setSubjects([]);
      setShowGrid(false);
      setStudents("");
      setBatches("");
    }
  };

  useEffect(() => {
    if (dept) {
      fetchSubjects();
      setIsLocked(true);
    }
  }, [dept, year]);

  const handleReset = async () => {
    const confirmReset = window.confirm("Are you sure you want to discard unsaved changes and reload the last saved configuration?");
    if (!confirmReset) return;
    await fetchSubjects();
    setIsLocked(true);
  };

  const handleAddNewRow = () => {
    if (isLocked) return;
    setSubjects(prev => [
      ...prev,
      {
        name: "",
        code: "",
        faculty: "",
        otherDept: "",
        otherFaculty: "",
        type: "theory",
        room: "",
        batchRequired: "no",
        hours: ""
      }
    ]);
  };

  const handleRemoveRow = (index) => {
    if (isLocked) return;
    setSubjects(prev => prev.filter((_, idx) => idx !== index));
  };

  // ============================================================
  // 🧱 CREATE GRID
  // ============================================================
  const createGrid = () => {
    let arr = [];
    for (let i = 0; i < numSubjects; i++) {
      arr.push({
        name: "",
        code: "",
        faculty: "",
        otherDept: "",
        otherFaculty: "",
        type: "theory",
        room: "",
        batchRequired: "no",
        hours: ""
      });
    }
    setSubjects(arr);
    setShowGrid(true);
    setIsLocked(false);
  };

  // ============================================================
  // ✏️ HANDLE CHANGE
  // ============================================================
  const handleChange = (index, field, value) => {
    if (isLocked) return;

    setSubjects(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      // Auto-clear otherFaculty if otherDept changes
      if (field === "otherDept") {
        updated[index].otherFaculty = "";
      }
      return updated;
    });
  };

  // ============================================================
  // 🔥 SAVE DATA
  // ============================================================
  const handleSave = async () => {
    try {
      const snapshot = await getDocs(collection(db, "subjects"));

      const oldDocs = snapshot.docs.filter(
        d => d.data().dept === dept && d.data().year === year
      );

      // DELETE OLD
      for (let d of oldDocs) {
        await deleteDoc(doc(db, "subjects", d.id));
      }

      // INSERT NEW
      for (let sub of subjects) {
        await addDoc(collection(db, "subjects"), {
          dept,
          year,
          students,
          batches,
          subject_name: sub.name,
          subject_code: sub.code,
          faculty_id: sub.faculty || null,
          other_department: sub.otherDept || null,
          other_faculty_id: sub.otherFaculty || null,
          type: sub.type,
          room: sub.room,
          batch_required: sub.batchRequired,
          hours: Number(sub.hours)
        });
      }

      await logActivity(user?.email || "faculty", "Save Subject Config", `Saved config for ${year} Year - ${dept}`);
      alert("Saved successfully ✅");
      setIsLocked(true);
    } catch (err) {
      console.error(err);
      await logActivity(user?.email || "faculty", "Save Subject Config Error", `Failed to save for ${year} Year: ${err.message}`);
      alert("Error saving");
    }
  };

  // ============================================================
  // 🗑️ DELETE ALL DATA FOR THIS YEAR
  // ============================================================
  const handleDeleteAll = async () => {
    const confirmDelete = window.confirm(
      `⚠️ WARNING: Are you sure you want to completely delete all subject data for ${year} Year? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;

    try {
      const snapshot = await getDocs(collection(db, "subjects"));

      const docsToDelete = snapshot.docs.filter(
        d => d.data().dept === dept && d.data().year === year
      );

      // Execute Deletions
      for (let d of docsToDelete) {
        await deleteDoc(doc(db, "subjects", d.id));
      }

      await logActivity(user?.email || "faculty", "Delete All Subjects", `Deleted all subjects for ${year} Year - ${dept}`);
      alert("All subject data deleted successfully 🗑️");
      
      // Reset UI completely back to Step 1
      setSubjects([]);
      setShowGrid(false);
      setNumSubjects(0);
      setStudents("");
      setBatches("");
      setIsLocked(true);

    } catch (err) {
      console.error(err);
      alert("Error deleting data");
    }
  };

  // ============================================================
  // 🧮 DYNAMIC CALCULATIONS
  // ============================================================
  const normalSubjects = subjects.filter(sub => !(sub.type === "theory" && sub.batchRequired === "yes"));
  const batchwiseTheory = subjects.filter(sub => sub.type === "theory" && sub.batchRequired === "yes");

  const normalHours = normalSubjects.reduce((sum, sub) => sum + (Number(sub.hours) || 0), 0);
  const batchwiseSum = batchwiseTheory.reduce((sum, sub) => sum + (Number(sub.hours) || 0), 0);
  const batchwiseHours = batchwiseTheory.length > 0 ? (batchwiseSum / batchwiseTheory.length) : 0;

  const totalHours = Number((normalHours + batchwiseHours).toFixed(1));
  const isTotalValid = totalHours === 36;

  // ============================================================
  // 🖥️ UI
  // ============================================================
  return (
    <>
      <style>{styles}</style>
      <div className="setup-wrapper">
        <div className="setup-inner">
          
          {/* Header */}
          <div className="glass-card header-banner" style={{ padding: "24px 32px" }}>
            <div>
              <h2 className="title-main">{year} Year Allocation</h2>
              <p className="subtitle">Data Entry & Setup for {user?.department}</p>
            </div>
            {showGrid && (
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                {!isLocked && (
                  <>
                    <button className="btn btn-outline" onClick={handleAddNewRow}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                      Add Row
                    </button>
                    <button className="btn btn-outline" onClick={handleReset}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
                      Reset Changes
                    </button>
                  </>
                )}
                {isLocked ? (
                  <button className="btn btn-outline" onClick={() => setIsLocked(false)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    Unlock to Edit
                  </button>
                ) : (
                  <button className="btn btn-success" onClick={() => setIsLocked(true)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                    Lock Data
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Guidelines Panel */}
          <div className="guidelines-panel">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              Setup Guidelines
            </h3>
            <ul>
              <li><b>Total Hours Requirement:</b> The sum of all subject hours must equal exactly <b>36</b> before generating the timetable.</li>
              <li><b>Rooms:</b> Every subject needs to be mentioned with a designated Room.</li>
              <li><b>Batch Requirement:</b> Select <i>'Yes'</i> if the lab/practical is conducted batch-wise. Select <i>'No'</i> for full-class lectures.</li>
              <li><b>Open Electives & Professional Electives:</b> Select <i>'Yes'</i> for Batch Requirement even for theory electives (like OE3 or PE3) if the class is divided into parallel choices/parts, ensuring slots do not overlap.</li>
              <li><b>Other Departments:</b> First select the 'Other Dept', then select the specific faculty from that department.</li>
            </ul>
          </div>

          {/* STEP 1: Initialization Form */}
          {!showGrid && (
            <div className="glass-card setup-form">
              <input
                className="setup-input"
                placeholder="Number of Subjects"
                type="number"
                onChange={(e) => setNumSubjects(e.target.value)}
              />
              <input
                className="setup-input"
                placeholder="Total Students"
                type="number"
                onChange={(e) => setStudents(e.target.value)}
              />
              <input
                className="setup-input"
                placeholder="Number of Batches"
                type="number"
                onChange={(e) => setBatches(e.target.value)}
              />
              <button className="btn btn-primary" onClick={createGrid}>
                Initialize Grid
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </button>
            </div>
          )}

          {/* STEP 1.5: Editable Students & Batches Summary inside Grid View */}
          {showGrid && (
            <div className="glass-card setup-form" style={{ padding: "20px 32px" }}>
              <div style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "#94a3b8" }}>Total Students:</span>
                  <input
                    type="number"
                    className="grid-input"
                    style={{ width: "120px", display: "inline-block" }}
                    value={students || ""}
                    disabled={isLocked}
                    onChange={(e) => setStudents(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "#94a3b8" }}>Number of Batches:</span>
                  <input
                    type="number"
                    className="grid-input"
                    style={{ width: "120px", display: "inline-block" }}
                    value={batches || ""}
                    disabled={isLocked}
                    onChange={(e) => setBatches(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Main Grid */}
          {showGrid && (
            <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject Name</th>
                      <th style={{width: "120px"}}>Code</th>
                      <th>Dept Faculty</th>
                      <th>Other Dept</th>
                      <th>Other Faculty</th>
                      <th style={{width: "120px"}}>Type</th>
                      <th style={{width: "140px"}}>Room</th>
                      <th style={{width: "120px"}}>Batch?</th>
                      <th style={{width: "100px"}}>Hours</th>
                      {!isLocked && <th style={{width: "80px"}}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((sub, index) => {
                      const filteredRooms = rooms.filter(r =>
                        sub.type === "lab" ? r.type === "lab" : r.type === "classroom"
                      );

                      const otherFacultyList = allUsers.filter(
                        u => u.role === "faculty" && u.department === sub.otherDept
                      );

                      return (
                        <tr key={index}>
                          <td>
                            <input
                              className="grid-input"
                              placeholder="e.g. Data Structures"
                              value={sub.name || ""}
                              disabled={isLocked}
                              onChange={(e) => handleChange(index, "name", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="grid-input"
                              placeholder="e.g. CS201"
                              value={sub.code || ""}
                              disabled={isLocked}
                              onChange={(e) => handleChange(index, "code", e.target.value)}
                            />
                          </td>
                          <td>
                            <select
                              className="grid-select"
                              value={sub.faculty || ""}
                              disabled={isLocked}
                              onChange={(e) => handleChange(index, "faculty", e.target.value)}
                            >
                              <option value="">-- Select --</option>
                              {facultyList.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className="grid-select"
                              value={sub.otherDept || ""}
                              disabled={isLocked}
                              onChange={(e) => handleChange(index, "otherDept", e.target.value)}
                            >
                              <option value="">-- Select --</option>
                              {[...new Set(allUsers.map(u => u.department).filter(Boolean))].map(d => (
                                <option key={d}>{d}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className="grid-select"
                              value={sub.otherFaculty || ""}
                              disabled={isLocked || !sub.otherDept}
                              onChange={(e) => handleChange(index, "otherFaculty", e.target.value)}
                            >
                              <option value="">-- Select --</option>
                              {otherFacultyList.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className="grid-select"
                              value={sub.type}
                              disabled={isLocked}
                              onChange={(e) => handleChange(index, "type", e.target.value)}
                            >
                              <option value="theory">Theory</option>
                              <option value="lab">Lab / Prac</option>
                            </select>
                          </td>
                          <td>
                            <select
                              className="grid-select"
                              value={sub.room || ""}
                              disabled={isLocked}
                              onChange={(e) => handleChange(index, "room", e.target.value)}
                            >
                              <option value="">-- Select --</option>
                              {filteredRooms.map(r => (
                                <option key={r.id}>{r.name}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className="grid-select"
                              value={sub.batchRequired}
                              disabled={isLocked}
                              onChange={(e) => handleChange(index, "batchRequired", e.target.value)}
                            >
                              <option value="no">No</option>
                              <option value="yes">Yes</option>
                            </select>
                          </td>
                          <td>
                            <input
                              className="grid-input"
                              type="number"
                              min="0"
                              placeholder="0"
                              value={sub.hours || ""}
                              disabled={isLocked}
                              onChange={(e) => handleChange(index, "hours", e.target.value)}
                            />
                          </td>
                          {!isLocked && (
                            <td style={{ textAlign: "center" }}>
                              <button 
                                className="btn btn-danger" 
                                style={{ padding: "8px 12px", borderRadius: "8px" }} 
                                onClick={() => handleRemoveRow(index)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bottom Action Bar */}
          {showGrid && (
            <div className="bottom-bar">
              <div 
                className="total-box"
                style={{ 
                  borderColor: isTotalValid ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
                  boxShadow: isTotalValid ? '0 0 20px rgba(16, 185, 129, 0.1)' : '0 0 20px rgba(239, 68, 68, 0.1)'
                }}
              >
                Allocated Hours: 
                <span 
                  className="total-num" 
                  style={{ color: isTotalValid ? '#10b981' : '#f87171' }}
                >
                  {totalHours}
                </span>
                <span style={{ fontSize: "14px", color: "#64748b" }}>/ 36</span>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <button className="btn btn-danger" onClick={handleDeleteAll}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  Delete All Data
                </button>

                {!isLocked && (
                  <button className="btn btn-primary" onClick={handleSave}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    Save Subject Configuration
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default SubjectPage;