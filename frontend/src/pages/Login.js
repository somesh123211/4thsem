import { useState } from "react";
import { useNavigate } from "react-router-dom";

// 🔥 Firebase imports
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase"; // ✅ FIXED: Importing from your local config file
import { doc, getDoc } from "firebase/firestore";

// ============================
// 🎨 ULTRA-PREMIUM CSS STYLES
// ============================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

  * {
    box-sizing: border-box;
  }

  .login-wrapper {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Plus Jakarta Sans', sans-serif;
    background-color: #0f172a;
    background-image: 
      radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
      radial-gradient(at 100% 100%, rgba(168, 85, 247, 0.15) 0px, transparent 50%);
    padding: 20px;
    position: relative;
    overflow: hidden;
  }

  /* Animated Glowing Background Orbs */
  .login-wrapper::before, .login-wrapper::after {
    content: '';
    position: absolute;
    width: 400px;
    height: 400px;
    border-radius: 50%;
    filter: blur(80px);
    z-index: 0;
    opacity: 0.5;
    animation: float 10s infinite alternate ease-in-out;
  }

  .login-wrapper::before {
    background: rgba(99, 102, 241, 0.3);
    top: -100px;
    left: -100px;
  }

  .login-wrapper::after {
    background: rgba(168, 85, 247, 0.3);
    bottom: -100px;
    right: -100px;
    animation-delay: -5s;
  }

  @keyframes float {
    0% { transform: translate(0, 0); }
    100% { transform: translate(30px, 30px); }
  }

  .login-card {
    position: relative;
    z-index: 1;
    background: rgba(30, 41, 59, 0.7);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    padding: 48px 40px;
    width: 100%;
    max-width: 480px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    text-align: center;
  }

  .brand-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
    border: 1px solid rgba(99, 102, 241, 0.3);
    margin-bottom: 24px;
    color: #818cf8;
  }

  .title-small {
    font-size: 16px;
    font-weight: 500;
    color: #94a3b8;
    margin-bottom: 8px;
    letter-spacing: 0.5px;
  }

  .title-main {
    font-size: 32px;
    font-weight: 800;
    margin: 0 0 32px 0;
    background: linear-gradient(to right, #c7d2fe, #e879f9);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    line-height: 1.2;
  }

  .input-group {
    position: relative;
    margin-bottom: 20px;
    text-align: left;
  }

  .input-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #cbd5e1;
    margin-bottom: 8px;
    margin-left: 4px;
  }

  .input-field {
    width: 100%;
    padding: 16px 20px;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    color: #f8fafc;
    font-size: 15px;
    font-family: inherit;
    transition: all 0.3s ease;
  }

  .input-field::placeholder {
    color: #64748b;
  }

  .input-field:focus {
    outline: none;
    border-color: #818cf8;
    background: rgba(15, 23, 42, 0.9);
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  }

  .eye-icon {
    position: absolute;
    right: 20px;
    top: 42px; /* aligned with the input field */
    color: #64748b;
    cursor: pointer;
    transition: color 0.2s ease;
  }

  .eye-icon:hover {
    color: #cbd5e1;
  }

  .btn-primary {
    width: 100%;
    padding: 16px;
    margin-top: 12px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    border: none;
    border-radius: 14px;
    font-size: 16px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.4);
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 30px -5px rgba(99, 102, 241, 0.5);
  }

  .btn-primary:active {
    transform: translateY(1px);
  }

  .divider {
    display: flex;
    align-items: center;
    margin: 32px 0;
  }

  .divider::before, .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
  }

  .divider span {
    padding: 0 16px;
    color: #64748b;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .btn-secondary {
    width: 100%;
    padding: 16px;
    background: transparent;
    color: #a5b4fc;
    border: 1px solid rgba(165, 180, 252, 0.3);
    border-radius: 14px;
    font-size: 15px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .btn-secondary:hover {
    background: rgba(165, 180, 252, 0.08);
    border-color: #a5b4fc;
    color: #c7d2fe;
  }
`;

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  // ============================
  // 🔐 HANDLE LOGIN
  // ============================
  const handleLogin = async () => {
    if (!email || !password) {
      alert("Enter email & password");
      return;
    }

    try {
      // 🔥 Firebase Auth
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      // 🔥 Firestore fetch
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        alert("User data not found in database");
        return;
      }

      const userData = docSnap.data();

      // 🔍 DEBUG (VERY IMPORTANT)
      console.log("🔥 FULL USER DATA:", userData);
      console.log("🔥 UID:", uid);

      // ✅ FINAL USER OBJECT (FIXED)
      const finalUser = {
        id: uid,                          // ✅ used in timetable matching
        email: userData.email,
        name: userData.name,
        role: userData.role,
        department: userData.department || ""   // ✅ FIX ADDED
      };

      // 🔥 SAVE TO LOCAL STORAGE
      localStorage.setItem("user", JSON.stringify(finalUser));

      alert("Login successful 🚀");

      // ============================
      // 🚀 ROLE BASED NAVIGATION
      // ============================
      if (
        email.toLowerCase().startsWith("hod") ||
        userData.role === "hod"
      ) {
        navigate("/hod-dashboard");
      } else {
        navigate("/dashboard");
      }

    } catch (err) {
      console.error(err);
      alert("Login failed: " + err.message);
    }
  };

  // ============================
  // 🖥️ UI RENDER
  // ============================
  return (
    <>
      {/* Injecting the premium styles */}
      <style>{styles}</style>

      <div className="login-wrapper">
        <div className="login-card">
          
          {/* Custom Calendar/Timetable Logo */}
          <div className="brand-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              <path d="M8 14h.01"></path>
              <path d="M12 14h.01"></path>
              <path d="M16 14h.01"></path>
              <path d="M8 18h.01"></path>
              <path d="M12 18h.01"></path>
              <path d="M16 18h.01"></path>
            </svg>
          </div>

          {/* requested Heading */}
          <div className="title-small">Welcome to</div>
          <h1 className="title-main">Smart Timetable<br/>Generator</h1>

          {/* EMAIL INPUT */}
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              className="input-field"
              type="email"
              placeholder="name@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* PASSWORD INPUT WITH EYE ICON */}
          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              className="input-field"
              style={{ paddingRight: "50px" }} // Room for eye icon
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            {/* Eye Toggle */}
            <div className="eye-icon" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </div>
          </div>

          {/* LOGIN BUTTON */}
          <button className="btn-primary" onClick={handleLogin}>
            Sign In Securely
          </button>

          {/* DIVIDER */}
          <div className="divider">
            <span>New Faculty?</span>
          </div>

          {/* REGISTER BUTTON */}
          <button className="btn-secondary" onClick={() => navigate("/register")}>
            Create an Account
          </button>

        </div>
      </div>
    </>
  );
}

export default Login;