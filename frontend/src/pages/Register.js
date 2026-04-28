import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

function Register() {
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const departments = [
    "Civil Engineering", "Computer Science and Engineering", "Electronics & Telecommunication",
    "Electrical Engineering", "Information Technology", "Mechanical Engineering",
    "Artificial Intelligence", "Computer Science & Engineering (Data Science)", "Industrial IOT",
    "Computer Science & Engineering (Cyber Security)", "Computer Science and Business Systems(TCS)",
    "Robotics and Artificial Intelligence", "1st year (ALL BRANCHES)"
  ];

  const handleRegister = async () => {
    if (!name || !dept || !password || !email) {
      alert("Please fill all fields.");
      return;
    }
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;
      await setDoc(doc(db, "users", uid), {
        name,
        email,
        department: dept,
        role: "faculty"
      });
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
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={{ fontSize: "26px", marginBottom: "8px" }}>Get Started</h2>
        <p style={{ color: "#9CA3AF", marginBottom: "32px" }}>Create your faculty account</p>

        <input style={styles.input} placeholder="Full Name" onChange={(e) => setName(e.target.value)} />
        <input style={styles.input} placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
        
        <select style={styles.input} onChange={(e) => setDept(e.target.value)}>
          <option value="" style={{backgroundColor: "#202020"}}>Select Department</option>
          {departments.map((d, index) => (<option key={index} value={d} style={{backgroundColor: "#202020"}}>{d}</option>))}
        </select>

        <input type="password" style={styles.input} placeholder="Password" onChange={(e) => setPassword(e.target.value)} />

        <button 
          style={styles.button} 
          onClick={handleRegister}
          onMouseOver={(e) => e.target.style.boxShadow = "0 0 20px rgba(168, 85, 247, 0.4)"}
          onMouseOut={(e) => e.target.style.boxShadow = "none"}
        >
          Create Account
        </button>
        
        <p style={{ marginTop: "24px", fontSize: "14px", color: "#6B7280" }}>
          Already registered? 
          <span style={{ color: "#A855F7", cursor: "pointer", fontWeight: "600", marginLeft: "5px" }} onClick={() => navigate("/")}>Login</span>
        </p>
      </div>
    </div>
  );
}

export default Register;