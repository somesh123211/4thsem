import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

// ============================
// 🎨 ULTRA-PREMIUM CSS STYLES
// ============================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

  * {
    box-sizing: border-box;
  }

  .dashboard-wrapper {
    min-height: 100vh;
    font-family: 'Plus Jakarta Sans', sans-serif;
    background-color: #0f172a;
    background-image: 
      radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
      radial-gradient(at 100% 100%, rgba(168, 85, 247, 0.15) 0px, transparent 50%);
    padding: 40px 20px;
    position: relative;
    overflow-x: hidden;
    color: #f8fafc;
  }

  /* Animated Glowing Background Orbs */
  .dashboard-wrapper::before, .dashboard-wrapper::after {
    content: '';
    position: fixed;
    width: 500px;
    height: 500px;
    border-radius: 50%;
    filter: blur(100px);
    z-index: 0;
    opacity: 0.4;
    animation: float 12s infinite alternate ease-in-out;
    pointer-events: none;
  }

  .dashboard-wrapper::before {
    background: rgba(99, 102, 241, 0.3);
    top: -150px;
    left: -150px;
  }

  .dashboard-wrapper::after {
    background: rgba(168, 85, 247, 0.3);
    bottom: -150px;
    right: -100px;
    animation-delay: -6s;
  }

  .dashboard-inner {
    position: relative;
    z-index: 1;
    max-width: 1300px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 30px;
  }

  /* Glass Cards */
  .glass-card {
    background: rgba(30, 41, 59, 0.6);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 30px;
    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5);
  }

  .header-flex {
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
    background: linear-gradient(to right, #c7d2fe, #e879f9);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .subtitle {
    font-size: 16px;
    color: #94a3b8;
    margin: 0;
    font-weight: 400;
  }
  
  .subtitle b {
    color: #e2e8f0;
    font-weight: 600;
  }

  .subtitle-dept {
    color: #818cf8;
    font-weight: 600;
    margin-left: 6px;
    padding-left: 6px;
    border-left: 2px solid rgba(255, 255, 255, 0.2);
  }

  /* Summary Section */
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 16px;
  }

  .summary-badge {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    transition: transform 0.2s ease, border-color 0.2s ease;
  }

  .summary-badge:hover {
    transform: translateY(-2px);
    border-color: rgba(168, 85, 247, 0.5);
  }

  .summary-subject {
    font-size: 13px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .summary-hours {
    font-size: 24px;
    font-weight: 800;
    color: #f8fafc;
  }

  .summary-hours span {
    font-size: 14px;
    color: #818cf8;
    font-weight: 600;
    margin-left: 4px;
  }

  /* Buttons */
  .btn-primary {
    padding: 14px 28px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.4);
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 30px -5px rgba(99, 102, 241, 0.5);
  }

  /* Table Styles */
  .table-container {
    overflow-x: auto;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(15, 23, 42, 0.4);
  }

  .glass-table {
    width: 100%;
    border-collapse: collapse;
    text-align: center;
  }

  .glass-table th {
    background: rgba(30, 41, 59, 0.8);
    color: #a5b4fc;
    font-weight: 600;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    border-right: 1px solid rgba(255, 255, 255, 0.04);
  }

  .glass-table td {
    padding: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    border-right: 1px solid rgba(255, 255, 255, 0.04);
    vertical-align: top;
    min-width: 160px;
    height: 120px;
  }

  .day-cell {
    font-weight: 800;
    font-size: 16px;
    color: #e2e8f0;
    background: rgba(30, 41, 59, 0.3);
    vertical-align: middle !important;
  }

  .empty-slot {
    color: rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-weight: 500;
  }

  /* Slot Cards */
  .slot-card {
    padding: 12px;
    border-radius: 10px;
    margin-bottom: 8px;
    text-align: left;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease;
  }
  
  .slot-card:last-child {
    margin-bottom: 0;
  }

  .slot-card:hover {
    transform: translateY(-2px);
  }

  .slot-lab {
    background: rgba(79, 70, 229, 0.2);
    border: 1px solid rgba(99, 102, 241, 0.3);
  }

  .slot-theory {
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.25);
  }

  .slot-subj {
    font-size: 14px;
    font-weight: 700;
    color: #f8fafc;
    margin-bottom: 4px;
  }

  .slot-room {
    font-size: 12px;
    color: #cbd5e1;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .slot-meta {
    font-size: 11px;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 6px;
    margin-top: 4px;
  }
`;

function Dashboard() {
  const [timetable, setTimetable] = useState([]);
  const [summary, setSummary] = useState({});

  // 🔥 Parse the stored user details from LocalStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const teacherId = user?.id;

  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const timeSlots = [
    "9:00-10:00",
    "10:00-11:00",
    "11:15-12:15",
    "12:15-1:15",
    "2:15-3:15",
    "3:15-4:15"
  ];

  const getSlotIndex = (code) => {
    if (!code || typeof code !== "string") return null;
    const num = parseInt(code.replace(/\D/g, ""));
    return isNaN(num) ? null : num - 1;
  };

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        if (!teacherId) return;

        const snap = await getDocs(collection(db, "timetables"));
        if (snap.empty) return;

        let teacherTT = Array(6).fill(0).map(() => Array(6).fill(null));
        let subjectCount = {}; 

        const dayOrder = ["day0","day1","day2","day3","day4","day5"];

        snap.forEach(docSnap => {
          const data = docSnap.data();
          const rawTT = data.timetable;
          const dept = data.department;
          const year = data.className;

          dayOrder.forEach((dayKey, dIndex) => {
            const day = rawTT?.[dayKey];
            if (!day) return;

            Object.values(day).forEach((slot) => {
              if (!slot) return;
              const entries = [];

              if (slot.COMMON) entries.push(slot.COMMON);

              ["B1","B2","B3"].forEach(b => {
                if (slot[b]) entries.push(slot[b]);
              });

              entries.forEach((entry) => {
                if (!entry) return;
                const isAssigned = entry.teacherId === teacherId ||
                  (typeof entry.teacherId === "string" && entry.teacherId.split("/").map(x => x.trim()).includes(teacherId));
                if (!isAssigned) return;

                let slotCodes = entry.slot;
                if (!Array.isArray(slotCodes)) {
                  slotCodes = [slotCodes];
                }

                slotCodes.forEach(code => {
                  const colIndex = getSlotIndex(code);
                  if (colIndex === null) return;

                  if (!teacherTT[dIndex][colIndex]) {
                    teacherTT[dIndex][colIndex] = [];
                  }

                  const exists = teacherTT[dIndex][colIndex].some(
                    e =>
                      e.subject === entry.subject &&
                      e.room === entry.room &&
                      e.year === year
                  );

                  if (!exists) {
                    teacherTT[dIndex][colIndex].push({
                      subject: entry.subject,
                      room: entry.room || "Class",
                      type: entry.type,
                      dept,
                      year,
                      slot: code
                    });

                    // 🔥 COUNT SUBJECT HOURS
                    subjectCount[entry.subject] = (subjectCount[entry.subject] || 0) + 1;
                  }
                });
              });
            });
          });
        });

        setTimetable(teacherTT);
        setSummary(subjectCount); 

      } catch (err) {
        console.error(err);
      }
    };

    fetchTimetable();
  }, [teacherId]);

  // 🔥 PDF DOWNLOAD FUNCTION (Untouched)
  const downloadPDF = () => {
    const win = window.open("", "", "width=900,height=700");

    win.document.write("<h2>Faculty Timetable</h2>");
    win.document.write("<table border='1' style='border-collapse:collapse;width:100%'>");

    win.document.write("<tr><th>Day</th>");
    timeSlots.forEach(t => win.document.write(`<th>${t}</th>`));
    win.document.write("</tr>");

    timetable.forEach((row, dIndex) => {
      win.document.write(`<tr><td>${days[dIndex]}</td>`);

      row.forEach(slot => {
        win.document.write("<td>");

        if (slot) {
          slot.forEach(e => {
            win.document.write(`
              <div>
                <b>${e.subject}</b><br/>
                ${e.room}<br/>
                ${e.dept} - ${e.year}<br/>
                ${e.slot}
              </div>
              <hr/>
            `);
          });
        } else {
          win.document.write("---");
        }

        win.document.write("</td>");
      });

      win.document.write("</tr>");
    });

    win.document.write("</table>");
    win.document.close();
    win.print();
  };

  return (
    <>
      {/* Inject Styles */}
      <style>{styles}</style>

      <div className="dashboard-wrapper">
        <div className="dashboard-inner">
          
          {/* Header Card */}
          <div className="glass-card header-flex">
            <div>
              <h1 className="title-main">Faculty Dashboard</h1>
              {/* 🔥 FULL NAME AND DEPARTMENT ADDED HERE */}
              <p className="subtitle">
                Welcome back, <b>{user?.name || user?.email}</b>
                {user?.department && (
                  <span className="subtitle-dept">{user.department}</span>
                )}
              </p>
            </div>
            
            {/* 🔥 DOWNLOAD BUTTON */}
            <button className="btn-primary" onClick={downloadPDF}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download Timetable
            </button>
          </div>

          {/* 🔥 SUBJECT SUMMARY CARD */}
          <div className="glass-card">
            <h2 style={{ margin: "0 0 10px 0", fontSize: "20px" }}>Weekly Load Summary</h2>
            
            {Object.keys(summary).length === 0 ? (
              <p style={{ color: "#94a3b8" }}>No active classes assigned.</p>
            ) : (
              <div className="summary-grid">
                {Object.entries(summary).map(([sub, count]) => (
                  <div key={sub} className="summary-badge">
                    <div className="summary-subject">{sub}</div>
                    <div className="summary-hours">{count}<span>hrs/wk</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🔥 TIMETABLE GRID */}
          <div className="glass-card" style={{ padding: "0" }}>
            <div className="table-container">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    {timeSlots.map((t, i) => (
                      <th key={i} style={(i === 1 || i === 3) ? { borderRight: "3px solid rgba(168, 237, 234, 0.25)" } : {}}>
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {days.map((day, dIndex) => (
                    <tr key={dIndex}>
                      <td className="day-cell">{day}</td>

                      {(timetable[dIndex] || Array(6).fill(null)).map((slot, sIndex, dayArr) => {
                        
                        // 🔥 Logic to identify continuous Labs perfectly in Dashboard data structure
                        const isSameLab = (arr1, arr2) => {
                          if (!arr1 || !arr2 || !Array.isArray(arr1) || !Array.isArray(arr2)) return false;
                          if (arr1.length === 0 || arr2.length === 0) return false;
                          if (arr1[0].type !== "lab") return false;
                          
                          const extract = (arr) => arr.map(e => `${e.subject}|${e.room}|${e.dept}|${e.year}`).sort().join("###");
                          return extract(arr1) === extract(arr2);
                        };

                        // Ensure labs only visually span inside their 2-hour blocks (0-1, 2-3, 4-5)
                        const isSecondPart = sIndex % 2 === 1 && isSameLab(slot, dayArr[sIndex - 1]);
                        if (isSecondPart) return null;

                        const isDoubleLab = sIndex % 2 === 0 && isSameLab(slot, dayArr[sIndex + 1]);

                        // Add thick border for breaks
                        const thickBorder = (sIndex === 1 || sIndex === 3) || (isDoubleLab && (sIndex + 1 === 1 || sIndex + 1 === 3));

                        return (
                          <td 
                            key={sIndex} 
                            colSpan={isDoubleLab ? 2 : 1}
                            style={thickBorder ? { borderRight: "3px solid rgba(168, 237, 234, 0.25)" } : {}}
                          >
                            {slot ? (
                              slot.map((entry, i) => (
                                <div 
                                  key={i} 
                                  className={`slot-card ${entry.type === "lab" ? "slot-lab" : "slot-theory"}`}
                                  style={isDoubleLab ? { minHeight: "80px", display: "flex", flexDirection: "column", justifyContent: "center" } : {}}
                                >
                                  <div className="slot-subj">{entry.subject}</div>
                                  <div className="slot-room">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                                    {entry.room}
                                  </div>
                                  <div className="slot-meta">
                                    <span>{entry.dept}-{entry.year}</span>
                                    <span>{entry.slot}</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="empty-slot">---</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default Dashboard;