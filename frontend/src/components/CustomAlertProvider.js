import React, { useState, useEffect } from "react";

// Inline styles for high customizability and simplicity
const modalStyles = `
  @keyframes alert-modal-in {
    0% {
      opacity: 0;
      transform: translateY(30px) scale(0.95);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes alert-overlay-in {
    0% {
      background-color: rgba(15, 23, 42, 0);
      backdrop-filter: blur(0px);
    }
    100% {
      background-color: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(12px);
    }
  }

  .custom-alert-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    padding: 20px;
    box-sizing: border-box;
    animation: alert-overlay-in 0.25s ease-out forwards;
    font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
  }

  .custom-alert-card {
    background: rgba(30, 41, 59, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 32px 24px;
    width: 100%;
    max-width: 440px;
    text-align: center;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    animation: alert-modal-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    color: #f8fafc;
  }

  .custom-alert-icon-wrapper {
    width: 64px;
    height: 64px;
    margin: 0 auto 20px auto;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  }

  .custom-alert-icon-success {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .custom-alert-icon-error {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .custom-alert-icon-warning {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }

  .custom-alert-icon-info {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  .custom-alert-title {
    font-size: 20px;
    font-weight: 800;
    margin: 0 0 10px 0;
    letter-spacing: -0.5px;
  }

  .custom-alert-message {
    font-size: 15px;
    color: #94a3b8;
    line-height: 1.6;
    margin: 0 0 28px 0;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .custom-alert-btn {
    padding: 12px 32px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 8px 20px -6px rgba(99, 102, 241, 0.5);
    outline: none;
  }

  .custom-alert-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px -6px rgba(99, 102, 241, 0.6);
  }

  .custom-alert-btn:active {
    transform: translateY(0);
  }
`;

export default function CustomAlertProvider({ children }) {
  const [alertInfo, setAlertInfo] = useState(null);

  useEffect(() => {
    // Check if style tag already exists, if not, append it
    const styleId = "custom-alert-modal-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = modalStyles;
      document.head.appendChild(style);
    }

    // Override window.alert
    const originalAlert = window.alert;
    window.alert = (message) => {
      if (message === undefined || message === null) return;
      const messageStr = String(message);

      let type = "info";
      let cleanMessage = messageStr;
      
      // Clean up symbols that are already inline emojis in existing alert strings
      if (messageStr.startsWith("✅")) {
        type = "success";
        cleanMessage = messageStr.replace(/^✅\s*/, "");
      } else if (messageStr.startsWith("❌")) {
        type = "error";
        cleanMessage = messageStr.replace(/^❌\s*/, "");
      } else if (
        messageStr.includes("success") || 
        messageStr.includes("Success") || 
        messageStr.includes("Saved Successfully")
      ) {
        type = "success";
      } else if (
        messageStr.includes("error") || 
        messageStr.includes("Error") || 
        messageStr.includes("Failed") || 
        messageStr.includes("clash") || 
        messageStr.includes("Clash") || 
        messageStr.includes("Denied") ||
        messageStr.includes("Access Denied")
      ) {
        type = "error";
      } else if (
        messageStr.includes("warning") || 
        messageStr.includes("Warning") || 
        messageStr.includes("confirm")
      ) {
        type = "warning";
      }

      setAlertInfo({ message: cleanMessage, type });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  const handleClose = () => {
    setAlertInfo(null);
  };

  return (
    <>
      {children}
      {alertInfo && (
        <AlertModal
          message={alertInfo.message}
          type={alertInfo.type}
          onClose={handleClose}
        />
      )}
    </>
  );
}

function AlertModal({ message, type, onClose }) {
  // Focus the OK button on mount to enable pressing Enter to dismiss
  const btnRef = React.useRef(null);
  useEffect(() => {
    if (btnRef.current) {
      btnRef.current.focus();
    }
  }, []);

  let icon = "💡";
  let title = "Notification";
  let iconClass = "custom-alert-icon-info";

  if (type === "success") {
    icon = "✓";
    title = "Success";
    iconClass = "custom-alert-icon-success";
  } else if (type === "error") {
    icon = "✕";
    title = "Alert";
    iconClass = "custom-alert-icon-error";
  } else if (type === "warning") {
    icon = "⚠";
    title = "Warning";
    iconClass = "custom-alert-icon-warning";
  }

  // Prevent clicks inside the card from closing the modal
  const handleCardClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="custom-alert-overlay" onClick={onClose}>
      <div className="custom-alert-card" onClick={handleCardClick}>
        <div className={`custom-alert-icon-wrapper ${iconClass}`}>
          {icon}
        </div>
        <h2 className="custom-alert-title">{title}</h2>
        <p className="custom-alert-message">{message}</p>
        <button 
          ref={btnRef} 
          className="custom-alert-btn" 
          onClick={onClose}
        >
          OK
        </button>
      </div>
    </div>
  );
}
