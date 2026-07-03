from flask import Flask, request, jsonify
from flask_cors import CORS
from timetable_core import generate_timetable
import os
import urllib.request
import json
import random

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

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


# ==========================================
# 📧 BREVO OTP EMAIL VERIFICATION SYSTEM
# ==========================================
otp_store = {}  # In-memory store: { email: { "otp": "123456", "name": "Prof" } }

def send_brevo_otp(email, name, otp):
    api_key = os.environ.get("BREVO_API_KEY")
    if not api_key:
        print("BREVO_API_KEY not found in environment!")
        return False
        
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "api-key": api_key,
        "content-type": "application/json",
        "accept": "application/json"
    }
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Email Verification</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: #f6f9fc;
                padding: 40px 20px;
                margin: 0;
            }}
            .card {{
                max-width: 480px;
                margin: 0 auto;
                background-color: #ffffff;
                border: 1px solid #e3e8ee;
                border-radius: 16px;
                padding: 40px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
            }}
            .logo {{
                font-size: 20px;
                font-weight: 700;
                color: #6366F1;
                margin-bottom: 24px;
                text-align: center;
            }}
            .title {{
                font-size: 22px;
                font-weight: 700;
                color: #262626;
                margin-bottom: 16px;
                text-align: center;
            }}
            .text {{
                font-size: 15px;
                line-height: 24px;
                color: #4f566b;
                margin-bottom: 32px;
                text-align: center;
            }}
            .otp-container {{
                background-color: #f1f5f9;
                border-radius: 12px;
                padding: 16px;
                font-size: 32px;
                font-weight: 800;
                letter-spacing: 6px;
                color: #0f172a;
                text-align: center;
                margin-bottom: 32px;
                border: 1px dashed #cbd5e1;
            }}
            .footer {{
                font-size: 13px;
                color: #8898aa;
                text-align: center;
                border-top: 1px solid #e3e8ee;
                padding-top: 24px;
                margin-top: 32px;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="logo">Smart Timetable Generator</div>
            <div class="title">Verify Your Email Address</div>
            <div class="text">
                Hello {name if name else "Faculty Member"},<br><br>
                Thank you for registering. Please use the following 6-digit One-Time Password (OTP) to complete your account verification:
            </div>
            <div class="otp-container">{otp}</div>
            <div class="text" style="font-size: 13px; color: #7f8c8d;">
                This verification code is valid for 10 minutes. If you did not request this registration code, please ignore this email.
            </div>
            <div class="footer">
                &copy; 2026 Smart Timetable Generator. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """

    payload = {
        "sender": { "name": "Smart Timetable Generator", "email": "no-reply@timetable-generator.com" },
        "to": [ { "email": email } ],
        "subject": f"{otp} is your email verification code",
        "htmlContent": html_content
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req) as res:
            res_body = res.read().decode("utf-8")
            print("Brevo send success:", res_body)
            return True
    except Exception as e:
        print("Error sending email via Brevo:", str(e))
        return False

@app.route("/send-otp", methods=["POST"])
def send_otp():
    data = request.json or {}
    email = data.get("email", "").strip().lower()
    name = data.get("name", "").strip()
    
    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400
        
    otp = str(random.randint(100000, 999999))
    otp_store[email] = {
        "otp": otp,
        "name": name
    }
    
    success = send_brevo_otp(email, name, otp)
    if success:
        return jsonify({"success": True, "message": "OTP sent successfully"})
    else:
        return jsonify({"success": False, "message": "Failed to send email verification code"}), 500

@app.route("/verify-otp", methods=["POST"])
def verify_otp():
    data = request.json or {}
    email = data.get("email", "").strip().lower()
    otp = data.get("otp", "").strip()
    
    if not email or not otp:
        return jsonify({"success": False, "message": "Email and OTP are required"}), 400
        
    stored = otp_store.get(email)
    if stored and stored["otp"] == otp:
        # OTP correct, pop it
        otp_store.pop(email, None)
        return jsonify({"success": True, "message": "Email verified successfully!"})
        
    return jsonify({"success": False, "message": "Invalid or expired verification code"}), 400


if __name__ == "__main__":
   

  port = int(os.environ.get("PORT", 5000))
  app.run(host="0.0.0.0", port=port)