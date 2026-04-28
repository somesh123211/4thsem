import { downloadPDF } from "./DownloadTimetable";
import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useParams, useNavigate } from "react-router-dom";
import {
  DragDropContext,
  Droppable,
  Draggable
} from "@hello-pangea/dnd";

function ViewTimetable() {
  const { id } = useParams();
  const navigate = useNavigate();
  const decodedId = decodeURIComponent(id);

  const [editedTT, setEditedTT] = useState(null);
  const [originalTT, setOriginalTT] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teacherMap, setTeacherMap] = useState({});
  const [canFinalize, setCanFinalize] = useState(false);
  const [totalTimetables, setTotalTimetables] = useState(0);

  const [meta, setMeta] = useState({
    department: "",
    year: ""
  });

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
  // COMPACT UI STYLES 
  // =========================
  const styles = {
    page: {
      backgroundColor: "#111827",
      color: "#F3F4F6",
      minHeight: "100vh",
      padding: "30px 20px",
      fontFamily: "'Inter', sans-serif"
    },
    headerCard: {
      backgroundColor: "#1F2937",
      padding: "16px 20px",
      borderRadius: "8px",
      marginBottom: "20px",
      border: "1px solid #374151",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      maxWidth: "95%",
      margin: "0 auto 20px"
    },
    title: { margin: 0, fontSize: "22px", color: "#F9FAFB" },
    subtitle: { margin: "4px 0 0 0", fontSize: "14px", color: "#9CA3AF" },
    buttonRow: { display: "flex", gap: "8px", flexWrap: "wrap" },
    btn: (bg) => ({
      padding: "8px 16px",
      backgroundColor: bg,
      color: "#FFF",
      border: "none",
      borderRadius: "6px",
      fontWeight: "bold",
      fontSize: "13px",
      cursor: "pointer",
      transition: "opacity 0.2s"
    }),
    table: {
      margin: "auto",
      borderCollapse: "collapse",
      backgroundColor: "#1F2937",
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      width: "95%"
    },
    th: {
      border: "1px solid #374151",
      padding: "12px 8px",
      backgroundColor: "#111827",
      color: "#9CA3AF",
      fontSize: "14px"
    },
    tdBase: {
      border: "1px solid #374151",
      padding: "6px", // Tightened to remove empty space
      verticalAlign: "top",
      minWidth: "125px"
    },
    subjectText: { fontSize: "14px", fontWeight: "bold", color: "#F3F4F6", lineHeight: "1.2" },
    teacherText: { fontSize: "12px", color: "#60A5FA", marginTop: "3px" },
    roomText: { fontSize: "11px", color: "#9CA3AF", marginTop: "2px" },
    batchText: { fontSize: "12px", fontWeight: "bold", color: "#E5E7EB", textDecoration: "underline", marginBottom: "3px" }
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
  // FETCH DATA
  // =========================
  useEffect(() => {
    const fetchData = async () => {
      await loadTeachers();
      const docRef = doc(db, "timetables", decodedId);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        alert("No timetable found");
        return;
      }

      const data = snap.data();
      setEditedTT(data.timetable);
      setOriginalTT(JSON.parse(JSON.stringify(data.timetable)));

      const snapAll = await getDocs(collection(db, "timetables"));
      setTotalTimetables(snapAll.size);

      const formattedYear = data.className ? `${data.className} Year` : "—";
      setMeta({
        department: data.department || "—",
        year: formattedYear
      });

      setLoading(false);
    };
    fetchData();
  }, [decodedId]);

  // =========================
  // CORE UTILS (Robust Slot Matching)
  // =========================
  const isSameSlot = (s1, s2) => {
    if (!s1 || !s2) return false;
    if (Object.keys(s1).length === 0 || Object.keys(s2).length === 0) return false;
    
    // Check if the underlying subject content matches exactly
    const getSubs = (obj) => {
      const subs = [];
      if (obj?.COMMON?.subject) subs.push(`COMMON:${obj.COMMON.subject}`);
      Object.keys(obj || {}).forEach(k => {
        if (k !== "COMMON" && obj[k]?.subject) subs.push(`${k}:${obj[k].subject}`);
      });
      return subs.sort().join("|");
    };
    
    const str1 = getSubs(s1);
    const str2 = getSubs(s2);
    return str1 === str2 && str1 !== "";
  };

  const updateSlotMeta = (entry, d, s) => {
    if (!entry || Object.keys(entry).length === 0) return entry;
    const dayCode = ["M", "T", "W", "TH", "F", "S"][d];
    const slotCode = `${dayCode}${s + 1}`;
    const updated = JSON.parse(JSON.stringify(entry));
    if (updated.COMMON) updated.COMMON.slot = slotCode;
    Object.keys(updated).forEach(k => { if (k !== "COMMON" && updated[k]) updated[k].slot = slotCode; });
    return updated;
  };

  // =========================
  // 🔥 ROBUST DND: STRICT BUCKET SWAPPING 
  // Guarantees no tearing across breaks
  // =========================
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const src = result.source.droppableId;
    const dest = result.destination.droppableId;
    if (src === dest) return;

    const [sd, ss] = src.split("-").map(Number);
    const [dd, ds] = dest.split("-").map(Number);

    setEditedTT((prevTT) => {
      const newTT = JSON.parse(JSON.stringify(prevTT));

      const getSlot = (d, s) => newTT[`day${d}`]?.[`slot${s}`];
      const setSlot = (d, s, val) => { newTT[`day${d}`][`slot${s}`] = val; };

      // Identify bucket boundaries (0, 2, or 4)
      const b_start_src = ss % 2 === 0 ? ss : ss - 1;
      const b_start_dest = ds % 2 === 0 ? ds : ds - 1;

      // Determine if either bucket currently holds a 2-hour block
      const srcIsDouble = isSameSlot(getSlot(sd, b_start_src), getSlot(sd, b_start_src + 1));
      const destIsDouble = isSameSlot(getSlot(dd, b_start_dest), getSlot(dd, b_start_dest + 1));

      // MDM BLOCKER
      const isMDM = (slot) => {
        if (!slot) return false;
        if (slot?.COMMON?.subject === "MDM") return true;
        for (let k in slot) { if (k !== "COMMON" && slot[k]?.subject === "MDM") return true; }
        return false;
      };

      if (totalTimetables > 1) {
        let movingMDM = false;
        if (srcIsDouble || destIsDouble) {
          if (isMDM(getSlot(sd, b_start_src)) || isMDM(getSlot(sd, b_start_src + 1)) ||
              isMDM(getSlot(dd, b_start_dest)) || isMDM(getSlot(dd, b_start_dest + 1))) movingMDM = true;
        } else {
          if (isMDM(getSlot(sd, ss)) || isMDM(getSlot(dd, ds))) movingMDM = true;
        }
        if (movingMDM) { alert("MDM cannot be moved when multiple timetables exist"); return prevTT; }
      }

      // 🟢 EXECUTE SWAP
      if (srcIsDouble || destIsDouble) {
        // 🔥 SWAP ENTIRE BUCKET: Protects labs and double-slots from tearing
        const s0 = getSlot(sd, b_start_src) || {};
        const s1 = getSlot(sd, b_start_src + 1) || {};
        const d0 = getSlot(dd, b_start_dest) || {};
        const d1 = getSlot(dd, b_start_dest + 1) || {};

        setSlot(dd, b_start_dest, updateSlotMeta(s0, dd, b_start_dest));
        setSlot(dd, b_start_dest + 1, updateSlotMeta(s1, dd, b_start_dest + 1));

        setSlot(sd, b_start_src, updateSlotMeta(d0, sd, b_start_src));
        setSlot(sd, b_start_src + 1, updateSlotMeta(d1, sd, b_start_src + 1));
      } else {
        // 🔥 SWAP SINGLE SLOT
        const s0 = getSlot(sd, ss) || {};
        const d0 = getSlot(dd, ds) || {};

        setSlot(dd, ds, updateSlotMeta(s0, dd, ds));
        setSlot(sd, ss, updateSlotMeta(d0, sd, ss));
      }

      return newTT;
    });

    setCanFinalize(false);
  };

  // =========================
  // FIND CHANGED SLOTS
  // =========================
  const getChangedSlots = () => {
    const changes = [];
    for (let d = 0; d < 6; d++) {
      for (let s = 0; s < 6; s++) {
        const oldSlot = originalTT?.[`day${d}`]?.[`slot${s}`];
        const newSlot = editedTT?.[`day${d}`]?.[`slot${s}`];
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
        alert("No changes detected");
        setCanFinalize(true);
        return;
      }

      const res = await fetch("http://localhost:5000/check-clash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timetable: editedTT,
          existing_timetables: existing,
          changed_slots: changed,
          current_id: decodedId
        })
      });

      const data = await res.json();

      if (data.success) {
        alert("✅ No Clash Found");
        setCanFinalize(true);
      } else {
        alert("❌ " + data.message);
        setCanFinalize(false);
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  // =========================
  // FINALIZE
  // =========================
  const handleFinalize = async () => {
    if (!canFinalize) {
      alert("Check clash first");
      return;
    }
    await updateDoc(doc(db, "timetables", decodedId), { timetable: editedTT });
    setOriginalTT(JSON.parse(JSON.stringify(editedTT)));
    alert("✅ Finalized successfully!");
  };

  // =========================
  // DELETE
  // =========================
  const handleDelete = async () => {
    if (!window.confirm("Delete timetable?")) return;
    await deleteDoc(doc(db, "timetables", decodedId));
    navigate("/dashboard");
  };

  // =========================
  // DOWNLOAD
  // =========================
  const handleDownload = async () => {
    const snapshot = await getDocs(collection(db, "subjects"));
    const subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    downloadPDF(editedTT, teacherMap, meta, subjects);
  };

  // =========================
  // RENDER SLOT
  // =========================
  const renderSlot = (entry) => {
    if (!entry) return null;
    const teacher = teacherMap[entry.teacherId] || teacherMap[entry.teacher] || "NA";

    return (
      <div style={{ padding: "3px 0" }}>
        <div style={styles.subjectText}>{entry.subject}</div>
        <div style={styles.teacherText}>{teacher}</div>
        <div style={styles.roomText}>({entry.room})</div>
      </div>
    );
  };

  // =========================
  // UI
  // =========================
  if (loading) return <div style={{ ...styles.page, textAlign: "center", fontSize: "20px" }}>Loading Timetable...</div>;

  return (
    <div style={styles.page}>
      
      {/* Top Header Card */}
      <div style={styles.headerCard}>
        <div>
          <h2 style={styles.title}>Timetable Viewer</h2>
          <p style={styles.subtitle}>{meta.department} • {meta.year}</p>
        </div>
        
        <div style={styles.buttonRow}>
          <button style={styles.btn("#6366F1")} onClick={handleCheckClash}>⚡ Check Clash</button>
          <button style={styles.btn("#10B981")} onClick={handleFinalize}>✔ Finalize</button>
          <button style={styles.btn("#F59E0B")} onClick={handleDownload}>📄 PDF</button>
          <button style={styles.btn("#EF4444")} onClick={handleDelete}>✕ Delete</button>
        </div>
      </div>

      {/* Main Table */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Day</th>
              {timeSlots.map((t, i) => <th key={i} style={styles.th}>{t}</th>)}
            </tr>
          </thead>

          <tbody>
            {days.map((dayLabel, d) => {
              const day = editedTT[`day${d}`] || {};

              return (
                <tr key={d}>
                  <td style={{ ...styles.tdBase, backgroundColor: "#111827", fontWeight: "bold", fontSize: "16px", textAlign: "center", verticalAlign: "middle" }}>
                    {dayLabel}
                  </td>

                  {timeSlots.map((_, s) => {
                    const slot = day[`slot${s}`];

                    // Strictly hide the second half of double slots to render colSpan=2 cleanly
                    const isSecondPart = s % 2 === 1 && isSameSlot(day[`slot${s}`], day[`slot${s - 1}`]);
                    if (isSecondPart) return null;

                    // Only identify a double slot if it starts on the even bucket boundary (0, 2, or 4)
                    const isDoubleSlot = s % 2 === 0 && isSameSlot(slot, day[`slot${s + 1}`]);

                    return (
                      <Droppable droppableId={`${d}-${s}`} key={s}>
                        {(provided) => (
                          <td
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            colSpan={isDoubleSlot ? 2 : 1}
                            style={{
                              ...styles.tdBase,
                              backgroundColor: isDoubleSlot ? "#374151" : "#1F2937", 
                              border: isDoubleSlot ? "2px solid #4B5563" : "1px solid #374151",
                              textAlign: "center"
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
                                    padding: "6px",
                                    backgroundColor: snapshot.isDragging ? "#4B5563" : "transparent",
                                    borderRadius: "6px",
                                    minHeight: "70px", // Reduced height to tighten space
                                    display: "flex",
                                    flexDirection: isDoubleSlot ? "row" : "column",
                                    justifyContent: "space-around"
                                  }}
                                >
                                  {/* COMMON */}
                                  {slot?.COMMON && renderSlot(slot.COMMON)}

                                  {/* BATCHES */}
                                  {Object.keys(slot || {}).map(k => {
                                    if (k === "COMMON") return null;
                                    const e = slot[k];
                                    if (!e) return null;
                                    return (
                                      <div key={k} style={{ margin: "3px" }}>
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
    </div>
  );
}

export default ViewTimetable;