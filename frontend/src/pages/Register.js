import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db, logActivity } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

function Register() {
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  
  // OTP States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const navigate = useNavigate();

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

  // Send OTP trigger
  const handleStartRegister = async () => {
    if (!name || !dept || !password || !email) {
      alert("Please fill all fields.");
      return;
    }

    // Bypass OTP only for the admin email
    if (email.trim().toLowerCase() === "someshninawe61@gmail.com") {
      await handleCompleteRegistration();
      return;
    }

    setSendingOtp(true);
    try {
      const response = await fetch(`${API}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name })
      });
      const data = await response.json();
      if (data.success) {
        setShowOtpModal(true);
      } else {
        alert(data.message || "Failed to send verification code.");
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to server. Please ensure the backend is running.");
    }
    setSendingOtp(false);
  };

  // Verify OTP and complete registration
  const handleVerifyAndRegister = async () => {
    if (!otp) {
      alert("Please enter the verification code.");
      return;
    }
    setVerifyingOtp(true);
    try {
      const response = await fetch(`${API}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });
      const data = await response.json();
      if (data.success) {
        setShowOtpModal(false);
        await handleCompleteRegistration();
      } else {
        alert(data.message || "Invalid verification code.");
      }
    } catch (err) {
      console.error(err);
      alert("Verification error.");
    }
    setVerifyingOtp(false);
  };

  // Final Registration helper
  const handleCompleteRegistration = async () => {
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;
      await setDoc(doc(db, "users", uid), {
        name,
        email,
        password, // Store password in Firestore for Admin to see!
        department: dept,
        role: "faculty"
      });
      await logActivity(email, "Registration", `Registered faculty user ${name} for ${dept}`);
      alert("Registered Successfully! 🚀");
      navigate("/");
    } catch (err) {
      alert(err.message);
    }
  };

  const styles = {
    page: {
      backgroundColor: "#050505",
      backgroundImage: "radial-gradient(circle at 50% 50%, #1e1b4b 0%, #050505 70%)",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      color: "#FFFFFF",
      fontFamily: "'Inter', sans-serif"
    },
    card: {
      width: "100%",
      maxWidth: "420px",
      padding: "40px",
      backgroundColor: "rgba(30, 30, 30, 0.6)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderRadius: "24px",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.8)",
      textAlign: "center"
    },
    input: {
      width: "100%",
      padding: "16px",
      marginBottom: "16px",
      backgroundColor: "rgba(255, 255, 255, 0.05)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "14px",
      color: "#FFF",
      fontSize: "15px",
      boxSizing: "border-box",
      transition: "all 0.3s ease"
    },
    button: {
      width: "100%",
      padding: "16px",
      background: "linear-gradient(135deg, #A855F7 0%, #6366F1 100%)",
      color: "#FFF",
      border: "none",
      borderRadius: "14px",
      cursor: "pointer",
      fontSize: "16px",
      fontWeight: "700",
      marginTop: "12px",
      transition: "transform 0.2s, box-shadow 0.2s"
    },
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      backdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "20px"
    },
    modal: {
      width: "100%",
      maxWidth: "400px",
      backgroundColor: "#0d0e15",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "24px",
      padding: "32px",
      textAlign: "center",
      boxShadow: "0 20px 40px rgba(0,0,0,0.6)"
    },
    otpInput: {
      width: "100%",
      padding: "16px",
      letterSpacing: "8px",
      textAlign: "center",
      fontSize: "24px",
      fontWeight: "800",
      backgroundColor: "rgba(255, 255, 255, 0.05)",
      border: "1px solid rgba(255, 255, 255, 0.15)",
      borderRadius: "14px",
      color: "#FFF",
      margin: "24px 0",
      boxSizing: "border-box"
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={{ fontSize: "26px", marginBottom: "8px" }}>Get Started</h2>
        <p style={{ color: "#9CA3AF", marginBottom: "32px" }}>Create your faculty account</p>

        <input 
          style={styles.input} 
          placeholder="Full Name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
        />
        <input 
          style={styles.input} 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
        />
        
        <select 
          style={styles.input} 
          value={dept} 
          onChange={(e) => setDept(e.target.value)}
        >
          <option value="" style={{backgroundColor: "#202020"}}>Select Department</option>
          {departments.map((d, index) => (
            <option key={index} value={d} style={{backgroundColor: "#202020"}}>{d}</option>
          ))}
        </select>

        <input 
          type="password" 
          style={styles.input} 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
        />

        <button 
          style={styles.button} 
          disabled={sendingOtp}
          onClick={handleStartRegister}
          onMouseOver={(e) => e.target.style.boxShadow = "0 0 20px rgba(168, 85, 247, 0.4)"}
          onMouseOut={(e) => e.target.style.boxShadow = "none"}
        >
          {sendingOtp ? "Sending Verification OTP..." : "Create Account"}
        </button>
        
        <p style={{ marginTop: "24px", fontSize: "14px", color: "#6B7280" }}>
          Already registered? 
          <span 
            style={{ color: "#A855F7", cursor: "pointer", fontWeight: "600", marginLeft: "5px" }} 
            onClick={() => navigate("/")}
          >
            Login
          </span>
        </p>
      </div>

      {/* OTP Verification Modal Overlay */}
      {showOtpModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={{ fontSize: "22px", margin: "0 0 12px 0", color: "#FFF" }}>Verify Email Address</h3>
            <p style={{ color: "#9CA3AF", fontSize: "14px", lineHeight: "20px", margin: 0 }}>
              We've sent a 6-digit verification code to <span style={{ color: "#A855F7", fontWeight: "600" }}>{email}</span>. Please enter it below to complete your registration.
            </p>

            <input
              type="text"
              maxLength="6"
              placeholder="000000"
              style={styles.otpInput}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            />

            <button
              style={styles.button}
              disabled={verifyingOtp}
              onClick={handleVerifyAndRegister}
            >
              {verifyingOtp ? "Verifying Code..." : "Verify & Create Account"}
            </button>

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
              <span
                style={{ color: "#9CA3AF", cursor: "pointer" }}
                onClick={() => setShowOtpModal(false)}
              >
                Cancel
              </span>
              <span
                style={{ color: "#6366F1", cursor: "pointer", fontWeight: "600" }}
                onClick={handleStartRegister}
              >
                Resend Code
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Register;