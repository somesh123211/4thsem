from flask import Flask, request, jsonify
from flask_cors import CORS
from timetable_core import generate_timetable
import os

app = Flask(__name__)

# ✅ FIX CORS PROPERLY
CORS(app, resources={r"/*": {"origins": "*"}})


@app.route("/generate", methods=["POST"])
def generate():
    data = request.json

    subjects = data.get("subjects", [])
    existing = data.get("existing_timetables", [])   # 🔥 NEW

    print("Subjects count:", len(subjects))
    for s in subjects:
        print(f"  [Subject] name: {s.get('subject_name')}, type: {s.get('type')}, batch_req: {s.get('batch_required') or s.get('batchRequired')}, hours: {s.get('hours')}, room: {s.get('room')}, batches: {s.get('batches')}")
    print("Existing Timetables:", len(existing))

    timetable = generate_timetable(subjects, existing)  # 🔥 UPDATED

    return jsonify({"timetable": timetable})


@app.route("/save-timetable", methods=["POST"])
def save_timetable():
    return jsonify({"status": "ok"})

from flask import request, jsonify

@app.route("/check-clash", methods=["POST", "OPTIONS"])
def check_clash():

    if request.method == "OPTIONS":
        return jsonify({"success": True})

    data = request.json or {}

    tt = data.get("timetable", {})
    existing_tts = data.get("existing_timetables", [])
    changed_slots = data.get("changed_slots", [])
    current_id = data.get("current_id")

    from collections import defaultdict

    teacher_busy = defaultdict(set)
    room_busy = defaultdict(set)

    DAYS = 6
    SLOTS = 6
    DAYS_MAP = ["M", "T", "W", "TH", "F", "S"]

    def slot_code(d, s):
        return f"{DAYS_MAP[d]}{s+1}"

    # =========================
    # 🔥 LOAD EXISTING CONSTRAINTS
    # =========================
    def load_existing():

        processed = set()

        for i, ett in enumerate(existing_tts):

            if isinstance(ett, dict) and ett.get("id") == current_id:
                continue

            for d in range(DAYS):
                for s in range(SLOTS):

                    slot = ett.get(f"day{d}", {}).get(f"slot{s}", {})

                    for entry in slot.values():

                        if not isinstance(entry, dict):
                            continue

                        eid = id(entry)
                        if eid in processed:
                            continue
                        processed.add(eid)

                        subject = entry.get("subject", "").strip().lower()
                        teacher = entry.get("teacherId")
                        room = entry.get("room")
                        typ = entry.get("type")

                        if subject == "mdm":
                            continue

                        # 🔥 SLOT SPAN
                        if typ == "lab":
                            slots = [
                                slot_code(d, s),
                                slot_code(d, min(s+1, SLOTS-1))
                            ]
                        else:
                            slots = [slot_code(d, s)]

                        # 🔥 TEACHER
                        if teacher:
                            for t in teacher.split("/"):
                                t_clean = t.strip()
                                if t_clean:
                                    for sc in slots:
                                        teacher_busy[t_clean].add(sc)

                        # 🔥 ROOM (Only check for labs)
                        is_entry_lab = typ == "lab" or "lab" in subject
                        if room and is_entry_lab:
                            if room == "CLASS":
                                pass
                            else:
                                for r in room.split("/"):
                                    r_clean = r.strip()
                                    if r_clean:
                                        for sc in slots:
                                            room_busy[r_clean].add(sc)

    load_existing()

    # =========================
    # 🔥 CHECK ONLY CHANGED SLOTS
    # =========================
    processed_new = set()

    for item in changed_slots:

        d = item["day"]
        s = item["slot"]

        slot = tt.get(f"day{d}", {}).get(f"slot{s}", {})

        for entry in slot.values():

            if not isinstance(entry, dict):
                continue

            eid = id(entry)
            if eid in processed_new:
                continue
            processed_new.add(eid)

            subject = entry.get("subject", "").strip().lower()
            teacher = entry.get("teacherId")
            room = entry.get("room")
            typ = entry.get("type")

            if subject == "mdm":
                continue

            # 🔥 SLOT SPAN
            if typ == "lab":
                slots = [
                    slot_code(d, s),
                    slot_code(d, min(s+1, SLOTS-1))
                ]
            else:
                slots = [slot_code(d, s)]

            # =========================
            # 🔴 TEACHER CHECK
            # =========================
            if teacher:
                for t in teacher.split("/"):
                    t_clean = t.strip()
                    if t_clean:
                        for sc in slots:
                            if sc in teacher_busy[t_clean]:
                                return jsonify({
                                    "success": False,
                                    "message": f"Teacher clash for {t_clean} at {sc}"
                                })

            # =========================
            # 🔴 ROOM CHECK
            # =========================
            is_entry_lab = typ == "lab" or "lab" in subject
            if room and is_entry_lab:
                if room == "CLASS":
                    pass
                else:
                    for r in room.split("/"):
                        r_clean = r.strip()
                        if r_clean:
                            for sc in slots:
                                if sc in room_busy[r_clean]:
                                    return jsonify({
                                        "success": False,
                                        "message": f"Room clash for {r_clean} at {sc}"
                                    })

    return jsonify({"success": True})


if __name__ == "__main__":
   

  port = int(os.environ.get("PORT", 5000))
  app.run(host="0.0.0.0", port=port)