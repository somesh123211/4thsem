import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  collection,
  getDocs,
  serverTimestamp,
  doc,
  setDoc,
  getDoc
} from "firebase/firestore";
import { db, logActivity } from "../firebase";
import {
  DragDropContext,
  Droppable,
  Draggable
} from "@hello-pangea/dnd";
const API = process.env.REACT_APP_API_URL;

function GenerateTimetable() {
  const navigate = useNavigate();
  const [year, setYear] = useState("");
  const [timetable, setTimetable] = useState(null);
  const [originalTT, setOriginalTT] = useState(null);
  const [loading, setLoading] = useState(false);
  const [teacherMap, setTeacherMap] = useState({});
  const [totalTimetables, setTotalTimetables] = useState(0);
  const [canFinalize, setCanFinalize] = useState(false);

  const user = JSON.parse(localStorage.getItem("user")) || {};

  useEffect(() => {
    if (!user || user.role !== "hod") {
      alert("Access Denied: HODs Only");
      navigate("/");
    }
  }, [user, navigate]);

  const days = ["M", "T", "W", "TH", "F", "S"];

  const timeSlots = [
    "9:00-10:00",
    "10:00-11:00",
    "11:15-12:15",
    "12:15-1:15",
    "2:15-3:15",
    "3:15-4:15"
  ];

  // =========================
  // UI STYLES (Clean Dark Mode)
  // =========================
  const styles = {
    page: {
      backgroundColor: "#111827",
      color: "#F3F4F6",
      minHeight: "100vh",
      padding: "30px 20px",
      fontFamily: "'Inter', sans-serif"
    },
    header: { color: "#F9FAFB", marginBottom: "20px", fontSize: "28px" },
    controls: {
      backgroundColor: "#1F2937",
      padding: "20px",
      borderRadius: "8px",
      display: "inline-block",
      marginBottom: "20px",
      border: "1px solid #374151"
    },
    select: {
      padding: "10px 15px",
      backgroundColor: "#374151",
      color: "#FFF",
      border: "1px solid #4B5563",
      borderRadius: "6px",
      marginRight: "15px",
      fontSize: "16px"
    },
    button: {
      padding: "10px 20px",
      backgroundColor: "#10B981",
      color: "#FFF",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "16px",
      fontWeight: "bold"
    },
    finalizeBtn: {
      padding: "12px 30px",
      backgroundColor: "#3B82F6",
      color: "#FFF",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "18px",
      fontWeight: "bold",
      marginTop: "30px"
    },
    table: {
      margin: "auto",
      borderCollapse: "collapse",
      backgroundColor: "#1F2937",
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      width: "95%"
    },
    th: {
      border: "1px solid #374151",
      padding: "15px",
      backgroundColor: "#111827",
      color: "#9CA3AF",
      fontSize: "16px"
    },
    tdBase: {
      border: "1px solid #374151",
      padding: "10px",
      verticalAlign: "top",
      minWidth: "140px"
    },
    subjectText: { fontSize: "16px", fontWeight: "bold", color: "#F3F4F6" },
    teacherText: { fontSize: "14px", color: "#60A5FA", marginTop: "4px" },
    roomText: { fontSize: "13px", color: "#9CA3AF", marginTop: "2px" },
    batchText: { fontSize: "14px", fontWeight: "bold", color: "#E5E7EB", textDecoration: "underline", marginBottom: "4px" },
    breakDivider: "4px solid #4B5563"
  };

  // =========================
  // LOAD TEACHERS
  // =========================
  const loadTeachers = async () => {
    const snap = await getDocs(collection(db, "users"));
    const map = {};
    snap.forEach(doc => {
      const d = doc.data();
      map[doc.id] = d.shortName || d.name || "NA";
    });
    setTeacherMap(map);
  };

  // =========================
  // GENERATE
  // =========================
  const handleGenerate = async () => {
    if (!year) return alert("Select year");
    setLoading(true);
    try {
      await loadTeachers();
      const snapshot = await getDocs(collection(db, "subjects"));
      const subjects = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            ...data,
            subject_name: data.subject_name || "",
            faculty_id: data.faculty_id || data.other_faculty_id || "",
            room: data.room || "CLASS"
          };
        })
        .filter(s => s.dept === user?.department && s.year === year);

      const snapshotTT = await getDocs(collection(db, "timetables"));
      const docId = `${user?.department}_${year}`;
      const existing = snapshotTT.docs
        .filter(doc => doc.id !== docId)
        .map(doc => doc.data());

      setTotalTimetables(snapshotTT.size);

      const res = await fetch(`${API}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjects, existing_timetables: existing })
      });

      const data = await res.json();
      setTimetable(data.timetable);
      setOriginalTT(JSON.parse(JSON.stringify(data.timetable))); // Track original layout
      setCanFinalize(true); // Allow saving right after a successful initial generation
      await logActivity(user?.email || "hod", "Generate Timetable", `Successfully generated timetable for ${year} Year - ${user?.department}`);
    } catch (err) {
      console.error(err);
      await logActivity(user?.email || "hod", "Generate Timetable Error", `Failed to generate for ${year} Year: ${err.message}`);
      alert("Backend error");
    }
    setLoading(false);
  };

  // =========================
  // FIND CHANGED SLOTS
  // =========================
  const getChangedSlots = () => {
    const changes = [];
    if (!originalTT || !timetable) return changes;

    for (let d = 0; d < 6; d++) {
      for (let s = 0; s < 6; s++) {
        const oldSlot = originalTT[d]?.[s];
        const newSlot = timetable[d]?.[s];
        if (JSON.stringify(oldSlot) !== JSON.stringify(newSlot)) {
          changes.push({ day: d, slot: s });
        }
      }
    }
    return changes;
  };

  // =========================
  // CLASH CHECK
  // =========================
  const handleCheckClash = async () => {
    try {
      const snap = await getDocs(collection(db, "timetables"));
      const existing = [];

      snap.forEach(docSnap => {
        const d = docSnap.data();
        if (d?.timetable) {
          existing.push({ id: docSnap.id, ...d.timetable });
        }
      });




      const changed = getChangedSlots();
      if (changed.length === 0) {
        alert("No changes detected.");
        setCanFinalize(true);
        return;
      }

      const department = user?.department || "unknown";
      const className = year;
      const docId = `${department}_${className}`;

      const res = await fetch(`${API}/check-clash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timetable: convertTimetable(timetable),
          existing_timetables: existing,
          changed_slots: changed,
          current_id: docId
        })
      });

      const data = await res.json();

      if (data.success) {
        alert("✅ No Clash Found. You may finalize the timetable.");
        setCanFinalize(true);
      } else {
        let clashMsg = data.message || "";
        if (teacherMap) {
          Object.keys(teacherMap).forEach((id) => {
            if (clashMsg.includes(id)) {
              clashMsg = clashMsg.replace(id, teacherMap[id]);
            }
          });
        }
        alert("❌ Clash Detected: " + clashMsg);
        setCanFinalize(false);
      }
    } catch (err) {
      console.error(err);
      alert("Server error while checking clashes.");
    }
  };

  // =========================
  // SLOT RENDER
  // =========================
  const renderSlot = (entry) => {
    if (!entry) return null;
    let teacherShort = "NA";
    if (entry.teacherId) {
      const ids = entry.teacherId.split("/");
      const names = ids.map(id => teacherMap[id.trim()] || id.trim());
      teacherShort = names.join(" / ");
    } else if (entry.teacher) {
      teacherShort = entry.teacher;
    }
    return (
      <div style={{ padding: "4px 0" }}>
        <div style={styles.subjectText}>{entry.subject}</div>
        <div style={styles.teacherText}>{teacherShort}</div>
        <div style={styles.roomText}>({entry.room})</div>
      </div>
    );
  };

  // =========================
  // 🟢 DRAG LOGIC (Strict Block Swapping)
  // =========================
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const [sd, ss] = result.source.droppableId.split("-").map(Number);
    const [dd, ds] = result.destination.droppableId.split("-").map(Number);

    if (sd === dd && ss === ds) return; // Dropped in same place

    setTimetable((prevTT) => {
      const newTT = JSON.parse(JSON.stringify(prevTT));

      // Utility to safely identify a 2-hour lab/project
      const isSameLab = (s1, s2) => {
        if (!s1 || !s2) return false;
        const isLabSlot = (obj) => {
          if (obj?.COMMON && obj.COMMON.type === "lab") return true;
          for (let k in obj) {
            if (k !== "COMMON" && obj[k] && obj[k].type === "lab") return true;
          }
          return false;
        };
        if (!isLabSlot(s1) || !isLabSlot(s2)) return false;
        if (Object.keys(s1).length === 0 || Object.keys(s2).length === 0) return false;
        const c1 = JSON.parse(JSON.stringify(s1));
        const c2 = JSON.parse(JSON.stringify(s2));
        const clearSlot = (obj) => {
          if (obj?.COMMON) delete obj.COMMON.slot;
          Object.keys(obj || {}).forEach(k => {
            if (k !== "COMMON" && obj[k]) delete obj[k].slot;
          });
        };
        clearSlot(c1);
        clearSlot(c2);
        return JSON.stringify(c1) === JSON.stringify(c2);
      };

      // Ensure slots get their new location names
      const updateSlotMeta = (entry, d, s) => {
        if (!entry || Object.keys(entry).length === 0) return entry;
        const dayCode = ["M", "T", "W", "TH", "F", "S"][d];
        const slotCode = `${dayCode}${s + 1}`;
        const updated = JSON.parse(JSON.stringify(entry));
        if (updated.COMMON) updated.COMMON.slot = slotCode;
        Object.keys(updated).forEach(k => {
          if (k !== "COMMON" && updated[k]) updated[k].slot = slotCode;
        });
        return updated;
      };

      // Get the boundary of the 2-hour block (e.g., slot 1 -> starts at 0, slot 3 -> starts at 2)
      const getBlockStart = (s) => (s % 2 === 0 ? s : s - 1);

      const srcStart = getBlockStart(ss);
      const destStart = getBlockStart(ds);

      // Check if the dragged item OR the target item is a 2-hour lab
      const srcIs2Hour = isSameLab(newTT[sd][srcStart], newTT[sd][srcStart + 1]);
      const destIs2Hour = isSameLab(newTT[dd][destStart], newTT[dd][destStart + 1]);

      // Check MDM constraints
      const isMDM = (slot) => {
        if (!slot) return false;
        if (slot?.COMMON?.subject === "MDM") return true;
        for (let k in slot) {
          if (k !== "COMMON" && slot[k]?.subject === "MDM") return true;
        }
        return false;
      };

      if (totalTimetables > 0) {
        let movingMDM = false;
        if (srcIs2Hour || destIs2Hour) {
          if (isMDM(newTT[sd][srcStart]) || isMDM(newTT[sd][srcStart + 1]) ||
            isMDM(newTT[dd][destStart]) || isMDM(newTT[dd][destStart + 1])) movingMDM = true;
        } else {
          if (isMDM(newTT[sd][ss]) || isMDM(newTT[dd][ds])) movingMDM = true;
        }

        if (movingMDM) {
          alert("MDM cannot be moved");
          return prevTT;
        }
      }

      // ==============================
      // EXECUTE THE SWAP
      // ==============================
      if (srcIs2Hour || destIs2Hour) {
        // 🔥 BLOCK SWAP: If ANY slot involved is a 2-hour Lab, swap the whole 2-hour block!
        const s0 = JSON.parse(JSON.stringify(newTT[sd][srcStart] || {}));
        const s1 = JSON.parse(JSON.stringify(newTT[sd][srcStart + 1] || {}));
        const d0 = JSON.parse(JSON.stringify(newTT[dd][destStart] || {}));
        const d1 = JSON.parse(JSON.stringify(newTT[dd][destStart + 1] || {}));

        newTT[dd][destStart] = updateSlotMeta(s0, dd, destStart);
        newTT[dd][destStart + 1] = updateSlotMeta(s1, dd, destStart + 1);

        newTT[sd][srcStart] = updateSlotMeta(d0, sd, srcStart);
        newTT[sd][srcStart + 1] = updateSlotMeta(d1, sd, srcStart + 1);
      } else {
        // 🔥 NORMAL 1x1 SWAP: Both are 1-hour theory slots
        const s0 = JSON.parse(JSON.stringify(newTT[sd][ss] || {}));
        const d0 = JSON.parse(JSON.stringify(newTT[dd][ds] || {}));

        newTT[sd][ss] = updateSlotMeta(d0, sd, ss);
        newTT[dd][ds] = updateSlotMeta(s0, dd, ds);
      }

      return newTT;
    });

    // Disable Finalize button because the slots have changed!
    setCanFinalize(false);
  };

  // =========================
  // CONVERT TO FIREBASE FORMAT
  // =========================
  const convertTimetable = (tt) => {
    const obj = {};
    tt.forEach((dayArr, d) => {
      obj[`day${d}`] = {};
      dayArr.forEach((slot, s) => {
        obj[`day${d}`][`slot${s}`] = JSON.parse(JSON.stringify(slot));
      });
    });
    return obj;
  };

  // =========================
  // FINALIZE & SAVE
  // =========================
  const handleFinalize = async () => {
    if (!canFinalize) {
      alert("Please successfully Check Clashes before finalizing.");
      return;
    }
    if (!timetable) return alert("No timetable to save");

    const department = user?.department || "unknown";
    const className = year;

    const docId = `${department}_${className}`;
    const docRef = doc(db, "timetables", docId);

    const existing = await getDoc(docRef);

    if (existing.exists()) {
      const overwrite = window.confirm("A timetable for this class already exists. Do you want to OVERWRITE it?");
      if (!overwrite) return;
    }

    await setDoc(docRef, {
      className,
      department,
      timetable: convertTimetable(JSON.parse(JSON.stringify(timetable))),
      createdAt: serverTimestamp()
    });

    // Reset tracker so 'changed slots' resolves correctly upon future checks
    setOriginalTT(JSON.parse(JSON.stringify(timetable)));
    await logActivity(user?.email || "hod", "Finalize Timetable", `Saved and finalized timetable for ${year} Year - ${department}`);
    alert("✅ Timetable Saved Successfully!");
  };

  // =========================
  // UI RENDER
  // =========================
  return (
    <div style={{ textAlign: "center", ...styles.page }}>
      <h2 style={styles.header}>Generate Timetable ⚡</h2>

      <div style={styles.controls}>
        <select style={styles.select} onChange={(e) => setYear(e.target.value)}>
          <option value="">Select Year</option>
          <option value="1st">1st</option>
          <option value="2nd">2nd</option>
          <option value="3rd">3rd</option>
          <option value="4th">4th</option>
        </select>
        <button style={styles.button} onClick={handleGenerate}>
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>

      <br />

      {timetable && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Day</th>
                {timeSlots.map((t, i) => (
                  <th key={i} style={{
                    ...styles.th,
                    borderRight: (i === 1 || i === 3) ? styles.breakDivider : styles.th.borderRight
                  }}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {timetable.map((dayData, d) => {
                return (
                  <tr key={d}>
                    <td style={{ ...styles.tdBase, backgroundColor: "#111827", fontWeight: "bold", fontSize: "18px", verticalAlign: "middle" }}>
                      {days[d]}
                    </td>

                    {dayData.map((slot, s) => {

                      const isSameLab = (s1, s2) => {
                        if (!s1 || !s2) return false;
                        const isLabSlot = (obj) => {
                          if (obj?.COMMON && obj.COMMON.type === "lab") return true;
                          for (let k in obj) {
                            if (k !== "COMMON" && obj[k] && obj[k].type === "lab") return true;
                          }
                          return false;
                        };
                        if (!isLabSlot(s1) || !isLabSlot(s2)) return false;
                        if (Object.keys(s1).length === 0 || Object.keys(s2).length === 0) return false;
                        const c1 = JSON.parse(JSON.stringify(s1));
                        const c2 = JSON.parse(JSON.stringify(s2));
                        const clearSlot = (obj) => {
                          if (obj?.COMMON) delete obj.COMMON.slot;
                          Object.keys(obj || {}).forEach(k => {
                            if (k !== "COMMON" && obj[k]) delete obj[k].slot;
                          });
                        };
                        clearSlot(c1);
                        clearSlot(c2);
                        return JSON.stringify(c1) === JSON.stringify(c2);
                      };

                      // Strictly ensure a lab only visually spans inside its 2-hour block (0-1, 2-3, 4-5)
                      const isSecondPart = s % 2 === 1 && isSameLab(dayData[s], dayData[s - 1]);
                      if (isSecondPart) return null;

                      const isDoubleLab = s % 2 === 0 && isSameLab(slot, dayData[s + 1]);

                      // Draw thick borders on the breaks
                      const thickBorder = (s === 1 || s === 3) || (isDoubleLab && (s + 1 === 1 || s + 1 === 3));

                      return (
                        <Droppable key={s} droppableId={`${d}-${s}`}>
                          {(provided) => (
                            <td
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              colSpan={isDoubleLab ? 2 : 1}
                              style={{
                                ...styles.tdBase,
                                backgroundColor: isDoubleLab ? "#374151" : "#1F2937",
                                border: isDoubleLab ? "2px solid #6B7280" : "1px solid #374151",
                                borderRight: thickBorder ? styles.breakDivider : "1px solid #374151"
                              }}
                            >
                              <Draggable draggableId={`${d}-${s}`} index={0}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={{
                                      ...provided.draggableProps.style,
                                      padding: "8px",
                                      backgroundColor: snapshot.isDragging ? "#4B5563" : "transparent",
                                      borderRadius: "6px",
                                      minHeight: "80px",
                                      display: "flex",
                                      flexDirection: isDoubleLab ? "row" : "column",
                                      justifyContent: "space-around"
                                    }}
                                  >
                                    {slot?.COMMON && renderSlot(slot.COMMON)}
                                    {Object.keys(slot || {}).map(k => {
                                      if (k === "COMMON") return null;
                                      const e = slot[k];
                                      if (!e) return null;
                                      return (
                                        <div key={k} style={{ margin: "5px" }}>
                                          <div style={styles.batchText}>{k}</div>
                                          {renderSlot(e)}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </Draggable>
                              {provided.placeholder}
                            </td>
                          )}
                        </Droppable>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DragDropContext>
      )}

      {/* Buttons Container */}
      {timetable && (
        <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "30px" }}>
          <button
            style={{ ...styles.finalizeBtn, marginTop: 0, backgroundColor: "#6366F1" }}
            onClick={handleCheckClash}
          >
            ⚡ Check Clash
          </button>

          <button
            style={{
              ...styles.finalizeBtn,
              marginTop: 0,
              opacity: canFinalize ? 1 : 0.5,
              cursor: canFinalize ? "pointer" : "not-allowed"
            }}
            onClick={handleFinalize}
            disabled={!canFinalize}
          >
            Finalize & Save ✅
          </button>
        </div>
      )}
    </div>
  );
}

export default GenerateTimetable;