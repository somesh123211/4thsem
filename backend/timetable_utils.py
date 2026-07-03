import random

DAYS = 6
SLOTS = 6


def get_slot_code(day, slot):
    days = ["M", "T", "W", "TH", "F", "S"]
    return f"{days[day]}{slot+1}"


def build_constraints(existing_timetables):
    
    teacher_busy = {}
    room_busy = {}

    for doc in existing_timetables:

        tt = doc.get("timetable", {})

        for d in range(DAYS):

            day_key = f"day{d}"
            if day_key not in tt:
                continue

            for s in range(SLOTS):

                slot_key = f"slot{s}"
                if slot_key not in tt[day_key]:
                    continue

                cell = tt[day_key][slot_key]

                for key in cell:

                    entry = cell[key]
                    if not entry:
                        continue

                    teacher = entry.get("teacherId")
                    room = entry.get("room")
                    is_lab = entry.get("type") == "lab" or "lab" in entry.get("subject", "").lower()

                    slots = entry.get("slot")

                    # 🔥 ALWAYS NORMALIZE
                    if isinstance(slots, list):
                        slot_list = slots
                    else:
                        slot_list = [slots]

                    for sl in slot_list:

                        if teacher:
                            for t in teacher.split("/"):
                                t_clean = t.strip()
                                if t_clean:
                                    teacher_busy.setdefault(t_clean, set()).add(sl)

                        if room and is_lab:
                            for r in room.split("/"):
                                r_clean = r.strip()
                                if r_clean:
                                    room_busy.setdefault(r_clean, set()).add(sl)

    return teacher_busy, room_busy

def is_valid_global(teacherId, room, d, s, teacher_busy, room_busy):
    
    slot_code = get_slot_code(d, s)

    if teacherId in teacher_busy and slot_code in teacher_busy[teacherId]:
        return False

    if room in room_busy and slot_code in room_busy[room]:
        return False

    return True


def get_teacher(subject_name, subjects):
    for s in subjects:
        name = s.get("subject_name")

        if name and name.strip().upper() == subject_name.strip().upper():
            teacher_id = (
                s.get("faculty_id") or
                s.get("other_faculty_id") or
                s.get("facultyId") or
                s.get("teacherId")
            )

            if not teacher_id:
                return "Unknown", "T-NA"

            return s.get("faculty_name", "Unknown"), teacher_id

    return "Unknown", "T-NA"


def get_lab(subject_name, subjects):
    for s in subjects:
        name = s.get("subject_name")

        if name and name.strip().upper() == subject_name.strip().upper():
            return s.get("room") or "LAB"

    return "LAB"


def normalize(subjects):
    for s in subjects:
        s["type"] = str(s.get("type", "")).lower()
        batch_req = s.get("batch_required")
        if batch_req is None:
            batch_req = s.get("batchRequired")
        s["batch_required"] = str(batch_req or "").lower()
        s["hours"] = int(s.get("hours", 0))
    return subjects


def is_batch_lab(s):
    return s["type"] == "lab" and s["batch_required"] in ["yes", "true", "1"]


def is_common_lab(s):
    return s["type"] == "lab" and s["batch_required"] in ["no", "false", "0"]


def is_theory(s):
    return s["type"] == "theory"


def is_batch_theory(s):
    return s["type"] == "theory" and s["batch_required"] in ["yes", "true", "1"]


def get_batches(subjects):
    max_batches = 1
    for s in subjects:
        val = s.get("batches")
        if val is not None:
            try:
                max_batches = max(max_batches, int(val))
            except ValueError:
                pass
    return max_batches


def empty_tt(batches):
    return [
        [{"COMMON": None, **{f"B{b+1}": None for b in range(batches)}}
         for _ in range(SLOTS)]
        for _ in range(DAYS)
    ]

def is_full_slot_empty(tt, d, s):
    
    slot = tt[d][s]

    # 🚫 BLOCK IF MDM PRESENT
    if isinstance(slot.get("COMMON"), dict):
        if slot["COMMON"].get("subject", "").lower() == "mdm":
            return False

    if slot["COMMON"]:
        return False

    for k in slot:
        if k != "COMMON" and slot[k] is not None:
            return False

    return True


def is_lab_block_free(tt, d, s):
    # check current and next slot
    if s + 1 >= SLOTS:
        return False

    return is_full_slot_empty(tt, d, s) and is_full_slot_empty(tt, d, s+1)