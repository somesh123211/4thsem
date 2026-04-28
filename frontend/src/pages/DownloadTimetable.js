import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const downloadPDF = (
  timetable,
  teacherMap,
  info,
  subjects = []
) => {

  const doc = new jsPDF("landscape");

  const normalize = (str) =>
    (str || "")
      .toString()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .trim();

  // =========================
  // SUBJECT MAP
  // =========================
  const subjectMap = {};

  subjects.forEach(s => {
    const key = normalize(s.subject_name);

    subjectMap[key] = {
      code: s.subject_code,
      students: Number(s.students || 0),
      batches: Number(s.batches || 0),
      original: s.subject_name
    };
  });

  const findBestMatch = (subjectKey) => {
    if (subjectMap[subjectKey]) return subjectMap[subjectKey];

    for (const key in subjectMap) {
      if (key.includes(subjectKey) || subjectKey.includes(key)) {
        return subjectMap[key];
      }
    }
    return null;
  };

  // =========================
  // HEADER (FINAL FIXED)
  // =========================
  doc.setFontSize(15);
  doc.setFont(undefined, "bold");

  doc.text(
    "St. Vincent Pallotti College of Engineering and Technology, Nagpur",
    140,
    10,
    { align: "center" }
  );

  doc.setFontSize(12);
  doc.setFont(undefined, "normal");

  // ✅ Department
  doc.text(
    `Department of ${info.department}`,
    140,
    18,
    { align: "center" }
  );

  // ✅ Year (FROM TIMETABLE ONLY)
  doc.setFont(undefined, "bold");
  doc.text(
    `${info.year} Year`,
    140,
    24,
    { align: "center" }
  );

  doc.setFontSize(13);
  doc.text("TIME TABLE", 140, 30, { align: "center" });

  // =========================
  // TIMETABLE GRID
  // =========================
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const timeSlots = [
    "9-10","10-11","BREAK",
    "11:15-12:15","12:15-1:15",
    "LUNCH","2:15-3:15","3:15-4:15"
  ];

  const body = [];

  days.forEach((dayLabel, d) => {

    const row = [dayLabel];
    const day = timetable[`day${d}`] || {};

    let slotIndex = 0;

    for (let i = 0; i < 8; i++) {

      if (i === 2) { row.push("BREAK"); continue; }
      if (i === 5) { row.push("LUNCH"); continue; }

      const slot = day[`slot${slotIndex}`];
      let text = "";

      const build = (e, prefix = "") => {
        if (!e) return;

        const teacher =
          teacherMap[e.teacherId] ||
          teacherMap[e.teacher] ||
          "NA";

        text += `${prefix}${e.subject}\n${teacher}\n(${e.room})\n`;
      };

      build(slot?.COMMON);

      Object.keys(slot || {}).forEach(k => {
        if (k !== "COMMON") build(slot[k], `${k} `);
      });

      row.push(text.trim());
      slotIndex++;
    }

    body.push(row);
  });

  autoTable(doc, {
    startY: 34,
    head: [["DAY", ...timeSlots]],
    body,
    styles: {
      fontSize: 7,
      halign: "center",
      lineColor: [0, 0, 0],
      lineWidth: 0.6
    },
    theme: "grid"
  });

  // =========================
  // 🔥 STUDENT BOX (CORRECT POSITION)
  // =========================
  const tableEndY = doc.lastAutoTable.finalY;

  // 👉 place just BELOW timetable (right side)
  const boxY = tableEndY + 5;

  let totalStudents = 0;
  let totalBatches = 0;

  Object.values(subjectMap).forEach(s => {
    totalStudents = Math.max(totalStudents, s.students);
    totalBatches = Math.max(totalBatches, s.batches);
  });

  doc.rect(180, boxY, 80, 25);

  doc.setFontSize(10);
  doc.text(`No. of Students: ${totalStudents}`, 185, boxY + 10);
  doc.text(`No. of Batches: ${totalBatches}`, 185, boxY + 18);

  // =========================
  // COURSE TABLE
  // =========================
  const courseStartY = boxY + 35;

  const courseRows = [];

  const usedSubjects = new Map();

  Object.values(timetable).forEach(day => {
    Object.values(day).forEach(slot => {

      const collect = (e) => {
        if (!e) return;

        const subject = normalize(e.subject);
        const teacherId = e.teacherId || e.teacher;

        if (subject) usedSubjects.set(subject, teacherId);
      };

      collect(slot?.COMMON);
      Object.keys(slot || {}).forEach(k => {
        if (k !== "COMMON") collect(slot[k]);
      });
    });
  });

  usedSubjects.forEach((teacherId, subjectKey) => {

    const s = findBestMatch(subjectKey);

    const teacher =
      teacherMap[teacherId] || teacherId || "NA";

    courseRows.push([
      s?.code || "—",
      s?.original || subjectKey,
      teacher
    ]);
  });

  autoTable(doc, {
    startY: courseStartY,
    head: [["COURSE CODE", "NAME OF SUBJECT", "NAME OF FACULTY"]],
    body: courseRows,
    styles: {
      fontSize: 9,
      lineColor: [0, 0, 0],
      lineWidth: 0.6
    },
    tableWidth: 160
  });

  // =========================
  doc.save("Timetable.pdf");
};