import random
from re import sub
import time
from timetable_utils import *


# =========================
# 🔥 NEW: MDM SLOT SYNC FUNCTION
# =========================
def get_mdm_fixed_slots(existing_timetables):

    fixed_slots = set()

    for doc in existing_timetables:
        tt = doc.get("timetable", {})

        for d in range(DAYS):
            day = f"day{d}"

            if day not in tt:
                continue

            for s in range(SLOTS):
                slot_key = f"slot{s}"

                if slot_key not in tt[day]:
                    continue

                cell = tt[day][slot_key]

                for key in cell:
                    entry = cell[key]

                    if not entry:
                        continue

                    subject = entry.get("subject", "")

                    if subject and subject.strip().lower() == "mdm":
                        slot_val = entry.get("slot")

                        if isinstance(slot_val, list):
                            for sl in slot_val:
                                fixed_slots.add(sl)
                        else:
                            fixed_slots.add(slot_val)

    return fixed_slots


# =========================
# 🔥 NEW: FORCE MDM PLACEMENT
# =========================

def force_place_mdm(tt, subjects, mdm_slots):
    
    if not mdm_slots:
        return

    for slot_code in mdm_slots:

        day_map = {"M":0,"T":1,"W":2,"TH":3,"F":4,"S":5}

        if slot_code.startswith("TH"):
            d = 3
            s = int(slot_code[2:]) - 1
        else:
            d = day_map.get(slot_code[0], 0)
            s = int(slot_code[1:]) - 1

        # 🔥 CLEAR SLOT
        tt[d][s]["COMMON"] = None
        for k in tt[d][s]:
            if k != "COMMON":
                tt[d][s][k] = None

        teacher, teacherId = get_teacher("MDM", subjects)
        room = get_room("MDM", subjects)  # ✅ FIX

        tt[d][s]["COMMON"] = {
            "subject": "MDM",
            "teacher": teacher,
            "teacherId": teacherId,
            "type": "theory",
            "room": room,
            "slot": slot_code
        }


# =========================
# BATCH LABS (FIXED EDGE BUG)
# =========================
def is_lab_slot(tt, d, s):
    
    # ONLY trust _lab_block flag
    if tt[d][s].get("_lab_block"):
        return True

    # OR if COMMON lab
    if isinstance(tt[d][s].get("COMMON"), dict):
        if tt[d][s]["COMMON"].get("type") == "lab":
            return True

    # OR batch entries
    for k in tt[d][s]:
        if k.startswith("B") and isinstance(tt[d][s][k], dict):
            if tt[d][s][k].get("type") == "lab":
                return True

    return False

def place_batch_labs(tt, batch_labs, batches, subjects, teacher_busy=None, room_busy=None):
    
    teacher_busy = teacher_busy or {}
    room_busy = room_busy or {}

    if not batch_labs:
        return

    # ✅ KEEP YOUR ORIGINAL SESSION LOGIC
    subject_sessions = []
    for s in batch_labs:
        for _ in range(s["hours"] // 2):
            subject_sessions.append(s["subject_name"])

    total_rounds = len(subject_sessions)

    # 🔥 FIX: controlled distribution
    day_lab_count = {d: 0 for d in range(DAYS)}

    def try_place(d, s, round_index):

        if s + 1 >= SLOTS:
            return False

        if not is_full_slot_empty(tt, d, s):
            return False
        if not is_full_slot_empty(tt, d, s + 1):
            return False

        slot1 = get_slot_code(d, s)
        slot2 = get_slot_code(d, s + 1)

        batch_assignments = []

        for b in range(batches):

            subject_index = (round_index + b) % len(subject_sessions)
            sub = subject_sessions[subject_index]

            teacher, teacherId = get_teacher(sub, subjects)
            room = get_lab(sub, subjects)

            if not is_valid_global(teacherId, room, d, s, teacher_busy, room_busy):
                return False
            if not is_valid_global(teacherId, room, d, s+1, teacher_busy, room_busy):
                return False

            batch_assignments.append((b, sub, teacher, teacherId, room))

        # ✅ PLACE
        for b, sub, teacher, teacherId, room in batch_assignments:

            entry = {
                "subject": sub,
                "teacher": teacher,
                "teacherId": teacherId,
                "type": "lab",
                "room": room,
                "slot": [slot1, slot2]
            }

            tt[d][s][f"B{b + 1}"] = entry
            tt[d][s + 1][f"B{b + 1}"] = entry

        tt[d][s]["_lab_block"] = True
        tt[d][s + 1]["_lab_block"] = True

        for _, _, _, teacherId, room in batch_assignments:
            teacher_busy.setdefault(teacherId, set()).update([slot1, slot2])
            room_busy.setdefault(room, set()).update([slot1, slot2])

        day_lab_count[d] += 1
        return True

    VALID_LAB_STARTS = [0, 2, 4]

    # 🔥 FIX: STRICT MON–FRI DISTRIBUTION
    preferred_days = [0,1,2,3,4]  # Mon–Fri
    random.shuffle(preferred_days)

    for round_index in range(total_rounds):

        placed = False

        # ✅ STEP 1: Try ONE lab per day (Mon–Fri)
        for d in preferred_days:

            if day_lab_count[d] >= 1:
                continue

            random.shuffle(VALID_LAB_STARTS)

            for s in VALID_LAB_STARTS:
                if try_place(d, s, round_index):
                    placed = True
                    break

            if placed:
                break

        # ✅ STEP 2: Allow second lab if needed
        if not placed:
            for d in preferred_days:

                if day_lab_count[d] >= 2:
                    continue

                for s in VALID_LAB_STARTS:
                    if try_place(d, s, round_index):
                        placed = True
                        break

                if placed:
                    break

        # ✅ STEP 3: LAST fallback (anywhere)
        if not placed:
           for d in range(DAYS):

        # 🚫 HARD LIMIT → MAX 2 LABS PER DAY
               if day_lab_count[d] >= 2:
                  continue

               for s in VALID_LAB_STARTS:
                   if try_place(d, s, round_index):
                       placed = True
                       break

               if placed:
                   break

        if not placed:
            print(f"⚠️ Batch lab NOT placed round {round_index}")


def shuffle_timetable(tt, existing_timetables):
    
    has_existing = existing_timetables and len(existing_timetables) > 0

    for d in range(DAYS):

        blocks = []
        skip_next = False

        for s in range(SLOTS):

            if skip_next:
                skip_next = False
                continue

            cell = tt[d][s]

            # =========================
            # 🔥 FIXED MDM (DO NOT MOVE)
            # =========================
            if isinstance(cell.get("COMMON"), dict) and \
               cell["COMMON"].get("subject", "").lower() == "mdm":

                blocks.append({
                    "size": 1,
                    "cells": [cell],
                    "fixed": True,
                    "pos": s
                })
                continue

            # =========================
            # 🔥 STRICT LAB DETECTION
            # =========================
            is_lab = cell.get("_lab_block", False)

            # ✅ ONLY if BOTH slots are marked lab
            if is_lab and s + 1 < SLOTS and tt[d][s+1].get("_lab_block", False):

                blocks.append({
                    "size": 2,
                    "cells": [cell, tt[d][s+1]],
                    "fixed": False,
                    "pos": s
                })

                skip_next = True
                continue

            # =========================
            # THEORY (NORMAL SLOT)
            # =========================
            blocks.append({
                "size": 1,
                "cells": [cell],
                "fixed": False,
                "pos": s
            })

        # =========================
        # SPLIT FIXED & MOVABLE
        # =========================
        fixed = {}
        movable = []

        for block in blocks:
            if has_existing and block["fixed"]:
                fixed[block["pos"]] = block
            else:
                movable.append(block)

        # =========================
        # RANDOMIZE
        # =========================
        random.shuffle(movable)

        new_row = [None] * SLOTS

        # =========================
        # PLACE FIXED FIRST
        # =========================
        for pos, block in fixed.items():
            for i, cell in enumerate(block["cells"]):
                new_row[pos + i] = cell

        free_pos = [i for i in range(SLOTS) if new_row[i] is None]
        used = set()

        # =========================
        # PLACE MOVABLE
        # =========================
        for block in movable:

            size = block["size"]

            # 🔥 LAB BLOCK (2 slots)
            if size == 2:
                placed = False

                for p in free_pos:

                    # align on even index (0,2,4)
                    if p in used or p % 2 != 0:
                        continue

                    if p + 1 not in free_pos or (p + 1) in used:
                        continue

                    new_row[p] = block["cells"][0]
                    new_row[p + 1] = block["cells"][1]

                    used.add(p)
                    used.add(p + 1)

                    placed = True
                    break

                # fallback
                if not placed:
                    for p in free_pos:
                        if p in used:
                            continue
                        if p + 1 >= SLOTS or (p + 1) in used:
                            continue

                        new_row[p] = block["cells"][0]
                        new_row[p + 1] = block["cells"][1]

                        used.add(p)
                        used.add(p + 1)
                        break

            # 🔥 THEORY (1 slot)
            else:
                for p in free_pos:
                    if p in used:
                        continue

                    new_row[p] = block["cells"][0]
                    used.add(p)
                    break

        # =========================
        # FILL REMAINING (SAFETY)
        # =========================
        for i in range(SLOTS):
            if new_row[i] is None:
                new_row[i] = tt[d][i]

        tt[d] = new_row

     
def place_common_labs(tt, common_labs, subjects, teacher_busy=None, room_busy=None):
    
    teacher_busy = teacher_busy or {}
    room_busy = room_busy or {}

    for sub in common_labs:

        sessions = sub["hours"] // 2

        for _ in range(sessions):

            placed = False

            for d in range(DAYS):

                for s in [0, 2, 4]:  # force proper 2-slot blocks

                    if s + 1 >= SLOTS:
                        continue

                    # ✅ ONLY check emptiness (remove over-restrictions)
                    if not is_full_slot_empty(tt, d, s):
                        continue
                    if not is_full_slot_empty(tt, d, s + 1):
                        continue

                    teacher, teacherId = get_teacher(sub["subject_name"], subjects)
                    room = get_lab(sub["subject_name"], subjects)

                    slot1 = get_slot_code(d, s)
                    slot2 = get_slot_code(d, s + 1)

                    # relaxed constraint (only teacher clash)
                    if not is_valid_global(teacherId, room, d, s, teacher_busy, room_busy):
                        continue

                    if not is_valid_global(teacherId, room, d, s+1, teacher_busy, room_busy):
                        continue

                    entry = {
                        "subject": sub["subject_name"],
                        "teacher": teacher,
                        "teacherId": teacherId,
                        "type": "lab",
                        "room": room,
                        "slot": [slot1, slot2]
                    }

                    tt[d][s]["COMMON"] = entry
                    tt[d][s+1]["COMMON"] = entry

                    # 🔥 IMPORTANT
                    tt[d][s]["_lab_block"] = True
                    tt[d][s+1]["_lab_block"] = True

                    teacher_busy.setdefault(teacherId, set()).update([slot1, slot2])
                    room_busy.setdefault(room, set()).update([slot1, slot2])

                    placed = True
                    break

                if placed:
                    break

            if not placed:
                print(f"⚠️ Common lab NOT placed: {sub['subject_name']}")
# =========================
# THEORY (UNCHANGED)
# =========================
def get_room(sub, subjects):
    for s in subjects:
        if s["subject_name"].strip() == sub.strip():  # ✅ safer match
            return s.get("room", "BS06")
    return "BS06"


    


def place_theory(tt, theory, subjects, teacher_busy=None, room_busy=None, mdm_slots=None):
    
    teacher_busy = teacher_busy or {}
    room_busy = room_busy or {}

    # 🎯 create pool
    pool = []
    for sub in theory:
        if sub["subject_name"].strip().lower() == "mdm":
            continue   # 🚫 NEVER ADD MDM HERE
        pool.extend([sub["subject_name"]] * sub["hours"])

    random.shuffle(pool)

    for d in range(DAYS):

        last_subject = None

        for s in range(SLOTS):

            # 🚫 DO NOT TOUCH LAB SLOT
            if is_lab_slot(tt, d, s):
                continue

            # 🚫 DO NOT TOUCH MDM SLOT (🔥 FIX)
            if isinstance(tt[d][s]["COMMON"], dict):
                if tt[d][s]["COMMON"].get("subject", "").lower() == "mdm":
                    continue

            # 🚫 already filled
            if tt[d][s]["COMMON"] is not None:
                last_subject = tt[d][s]["COMMON"]["subject"]
                continue

            placed = False

            for sub in list(pool):

                # 🚫 PREVENT SAME SUBJECT BACK-TO-BACK
                if sub == last_subject:
                    continue

                teacher, teacherId = get_teacher(sub, subjects)
                room = get_room(sub, subjects)

                slot_code = get_slot_code(d, s)

                # 🚫 clash check
                if not is_valid_global(teacherId, room, d, s, teacher_busy, room_busy):
                    continue

                # ✅ PLACE
                tt[d][s]["COMMON"] = {
                    "subject": sub,
                    "teacher": teacher,
                    "teacherId": teacherId,
                    "type": "theory",
                    "room": room,
                    "slot": slot_code
                }

                teacher_busy.setdefault(teacherId, set()).add(slot_code)
                room_busy.setdefault(room, set()).add(slot_code)

                pool.remove(sub)

                last_subject = sub
                placed = True
                break

            if not placed:
                last_subject = None

def fill_empty_slots(tt, subjects, teacher_busy=None, room_busy=None):

    teacher_busy = teacher_busy or {}
    room_busy = room_busy or {}

    theory_subjects = [
        s for s in subjects 
        if s["type"] == "theory" and s["subject_name"].strip().lower() != "mdm"
]
    for d in range(DAYS):

        last_subject = None  # 🔥 track previous subject

        for s in range(SLOTS):

            # 🚫 DO NOT TOUCH LAB
            if is_lab_slot(tt, d, s):
                continue

            # 🚫 skip filled
            if tt[d][s]["COMMON"] is not None:
                last_subject = tt[d][s]["COMMON"]["subject"]
                continue

            # 🔥 shuffle subjects (randomization)
            random.shuffle(theory_subjects)

            placed = False

            for sub_obj in theory_subjects:

                sub = sub_obj["subject_name"]

                # 🚫 NO REPEAT
                if sub == last_subject:
                    continue

                # 🚫 skip MDM
                if sub.strip().lower() == "mdm":
                    continue

                teacher, teacherId = get_teacher(sub, subjects)
                room = get_room(sub, subjects)

                slot_code = get_slot_code(d, s)

                # 🚫 clashes
                if teacherId in teacher_busy and slot_code in teacher_busy[teacherId]:
                    continue

                if room in room_busy and slot_code in room_busy[room]:
                    continue

                # ✅ PLACE
                tt[d][s]["COMMON"] = {
                    "subject": sub,
                    "teacher": teacher,
                    "teacherId": teacherId,
                    "type": "theory",
                    "room": room,
                    "slot": slot_code
                }

                teacher_busy.setdefault(teacherId, set()).add(slot_code)
                room_busy.setdefault(room, set()).add(slot_code)

                last_subject = sub
                placed = True
                break

            if not placed:
                last_subject = None

# MAIN
# =========================
import time
import random

def generate_timetable(subjects, existing_timetables=None):
    
    # 🔥 RANDOM SEED
    random.seed(time.time())

    # normalize + shuffle
    subjects = normalize(subjects)
    random.shuffle(subjects)

    # constraints
    teacher_busy, room_busy = build_constraints(existing_timetables or [])

    # =========================
    # 🔥 FINAL MDM LOGIC
    # =========================

    # 1️⃣ Get from existing timetable
    mdm_slots = get_mdm_fixed_slots(existing_timetables or [])

    # 2️⃣ If NOT present → generate from DB
    if not mdm_slots:

        mdm_hours = 0

        for s in subjects:
            if s["subject_name"].strip().lower() == "mdm":
                mdm_hours = s["hours"]
                break

        if mdm_hours > 0:
            days = [0, 1, 2, 3, 4]  # Mon–Fri
            random.shuffle(days)

            for i in range(min(mdm_hours, len(days))):
                d = days[i]
                mdm_slots.add(get_slot_code(d, 3))  # fixed slot

    # =========================
    # 🔥 REMOVE CONSECUTIVE MDM
    # =========================
    def remove_adjacent_mdm(mdm_slots):
        cleaned = set()

        for slot in sorted(mdm_slots):
            day = slot[:-1]
            s = int(slot[-1])

            prev = f"{day}{s-1}"
            next_ = f"{day}{s+1}"

            if prev in cleaned or next_ in cleaned:
                continue

            cleaned.add(slot)

        return cleaned

    mdm_slots = remove_adjacent_mdm(mdm_slots)

    # =========================
    # SPLIT SUBJECT TYPES
    # =========================
    batch_labs = []
    common_labs = []
    theory = []

    for s in subjects:
        if is_batch_lab(s):
            batch_labs.append(s)
        elif is_common_lab(s):
            common_labs.append(s)
        elif is_theory(s):
            theory.append(s)

    # =========================
    # INIT
    # =========================
    batches = get_batches(subjects)
    tt = empty_tt(batches)

    # =========================
    # STEP 1: PLACE LABS
    # =========================
    force_place_mdm(tt, subjects, mdm_slots)

    place_batch_labs(
        tt, batch_labs, batches, subjects,
        teacher_busy, room_busy
    )

    place_common_labs(
        tt, common_labs, subjects,
        teacher_busy, room_busy
    )

    force_place_mdm(tt, subjects, mdm_slots)

    # =========================
    # STEP 2: PLACE THEORY
    # =========================
    place_theory(
        tt, theory, subjects,
        teacher_busy, room_busy, mdm_slots
    )

    # =========================
    # STEP 3: FILL EMPTY
    # =========================
    fill_empty_slots(
        tt, subjects,
        teacher_busy, room_busy
    )

    # =========================
    # CLEANUP (_lab_block)
    # =========================
    for d in range(DAYS):
        for s in range(SLOTS):
            if isinstance(tt[d][s], dict):
                tt[d][s].pop("_lab_block", None)

    return tt










