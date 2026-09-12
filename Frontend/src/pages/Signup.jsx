// src/pages/Signup.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import "./Signup.css";

const TOTAL_STEPS = 4;
const STEP_LABELS = ["Account", "Verification", "Profile", "Confirm"];

const ROLES = [
  { id: "student", icon: "school", label: "Student", desc: "Learning & Education" },
  { id: "professional", icon: "work", label: "Professional", desc: "Full-time Employee" },
  { id: "freelancer", icon: "rocket_launch", label: "Freelancer", desc: "Independent Work" },
  { id: "business", icon: "apartment", label: "Business Owner", desc: "Company & Enterprise" },
];

/* ═══ Icon Components ═══ */
const MaterialIcon = ({ name, className = "", filled = false, size }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{
      fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0",
      ...(size ? { fontSize: size } : {}),
    }}
  >
    {name}
  </span>
);

const GoogleIcon = () => (
  <svg className="google-icon" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
  </svg>
);

const CheckIcon = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function Stepper({ currentStep }) {
  const steps = [
    { num: 1, label: "Account" },
    { num: 2, label: "Verification" },
    { num: 3, label: "Profile" },
    { num: 4, label: "Confirm" },
  ];

  const TOTAL_STEPS = steps.length;
  const progressPercent = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="stepper-wrapper mb-6">
      <div className="stepper">
        <div className="stepper-track">
          <div className="stepper-track-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        {steps.map((step) => {
          const isActive = currentStep === step.num;
          const isCompleted = currentStep > step.num;
          return (
            <div key={step.num} className="stepper-step">
              <div className={`stepper-node ${isActive ? "active" : isCompleted ? "completed" : "inactive"}`}>
                {isCompleted ? (
                  <CheckIcon className="w-3.5 h-3.5" />
                ) : (
                  <span className="stepper-node-number">{step.num}</span>
                )}
              </div>
              <div className={`stepper-label ${isActive ? "active" : isCompleted ? "completed" : ""}`}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══ Password Strength Meter ═══ */
function PasswordStrength({ password }) {
  let strength = 0;
  let label = "Weak";
  let colorClass = "weak";

  if (password.length > 0) {
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 1) { label = "Fair"; colorClass = "fair"; }
    else if (strength <= 2) { label = "Good"; colorClass = "good"; }
    else if (strength <= 3) { label = "Strong"; colorClass = "strong"; }
    else { label = "Very Strong"; colorClass = "very-strong"; }
  }

  const segments = password.length === 0 ? 0 : Math.min(strength + 1, 4);

  return (
    <div className="password-strength">
      <div className="strength-segments">
        {[1, 2, 3, 4].map((seg) => (
          <div key={seg} className={`strength-segment ${seg <= segments ? colorClass : "empty"}`} />
        ))}
      </div>
    </div>
  );
}

/* ═══ Section A: Choose signup method ═══ */
function StepChooseMethod({ onGoogle, onEmail }) {
  return (
    <>
      <div className="step-header">
        <div className="step-badge">
          <MaterialIcon name="rocket_launch" size="14px" />
          Account setup
        </div>
        <h1>Get started</h1>
        <p>Pick Google or email — takes under a minute. No credit card required.</p>
      </div>

      <button type="button" className="google-btn choose-primary" onClick={onGoogle}>
        <GoogleIcon />
        <span>Continue with Google</span>
      </button>
      <p className="choose-helper">Fastest · no password</p>

      <div className="or-divider">
        <span>or</span>
      </div>

      <button type="button" className="email-signup-btn" onClick={onEmail}>
        <MaterialIcon name="mail" size="20px" />
        <span>Sign up with email</span>
      </button>
      <p className="choose-helper">Use your work email</p>

      <p className="legal-text">
        By continuing, you agree to our{" "}
        <a href="#terms" onClick={(e) => e.preventDefault()}>Terms of Service</a>{" "}
        and{" "}
        <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.
      </p>
    </>
  );
}

/* ═══ Step 1: Basic Info (email path) ═══ */
function StepBasicInfo({ form, onChange, onNext, onBack, errors, submitting }) {
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);

  return (
    <>
      <div className="step-header">
        <h1>Create your account</h1>
        <p>Enter your details to continue verification.</p>
      </div>

      {/* Name Row */}
      <div className="form-input-row">
        <div className="form-group">
          <label className="form-label" htmlFor="firstName">First name</label>
          <div className="input-wrapper">
            <input
              id="firstName"
              className={`form-input${errors.firstName ? " error" : ""}`}
              type="text"
              placeholder="Alex"
              value={form.firstName}
              onChange={(e) => onChange("firstName", e.target.value)}
              autoComplete="given-name"
            />
          </div>
          {errors.firstName && <span className="form-error">{errors.firstName}</span>}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="lastName">Last name</label>
          <div className="input-wrapper">
            <input
              id="lastName"
              className={`form-input${errors.lastName ? " error" : ""}`}
              type="text"
              placeholder="Morgan"
              value={form.lastName}
              onChange={(e) => onChange("lastName", e.target.value)}
              autoComplete="family-name"
            />
          </div>
          {errors.lastName && <span className="form-error">{errors.lastName}</span>}
        </div>
      </div>

      {/* Email */}
      <div className="form-group">
        <label className="form-label" htmlFor="email">Email address</label>
        <div className="input-wrapper has-icon">
          <span className="input-icon">
            <MaterialIcon name="mail" size="20px" />
          </span>
          <input
            id="email"
            className={`form-input${errors.email ? " error" : ""}`}
            type="email"
            placeholder="alex.morgan@company.com"
            value={form.email}
            onChange={(e) => onChange("email", e.target.value)}
            autoComplete="email"
          />
        </div>
        {errors.email && <span className="form-error">{errors.email}</span>}
      </div>

      {/* Password */}
      <div className="form-group">
        <div className="form-label-row">
          <label className="form-label" htmlFor="password">Password</label>
          <span className="secure-badge">
            <MaterialIcon name="verified" size="14px" />
            Secure Setup
          </span>
        </div>
        <div className="input-wrapper has-icon">
          <span className="input-icon">
            <MaterialIcon name="lock" size="20px" />
          </span>
          <input
            id="password"
            className={`form-input${errors.password ? " error" : ""}`}
            type={showPw ? "text" : "password"}
            placeholder="Create a strong password"
            value={form.password}
            onChange={(e) => onChange("password", e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPw(!showPw)}
            aria-label="Toggle password visibility"
          >
            <MaterialIcon name={showPw ? "visibility_off" : "visibility"} size="20px" />
          </button>
        </div>
        <PasswordStrength password={form.password} />
        {errors.password && <span className="form-error">{errors.password}</span>}
      </div>

      {/* Confirm Password */}
      <div className="form-group">
        <label className="form-label" htmlFor="confirmPassword">Confirm password</label>
        <div className="input-wrapper has-icon">
          <span className="input-icon">
            <MaterialIcon name="enhanced_encryption" size="20px" />
          </span>
          <input
            id="confirmPassword"
            className={`form-input${errors.confirmPassword ? " error" : ""}`}
            type={showCpw ? "text" : "password"}
            placeholder="Re-enter your password"
            value={form.confirmPassword}
            onChange={(e) => onChange("confirmPassword", e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowCpw(!showCpw)}
            aria-label="Toggle confirm password visibility"
          >
            <MaterialIcon name={showCpw ? "visibility_off" : "visibility"} size="20px" />
          </button>
        </div>
        {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
      </div>

      <div className="btn-group">
        <button type="button" className="btn-primary" onClick={onNext} disabled={submitting}>
          {submitting ? <span className="btn-spinner" /> : (
            <>
              <span>Continue to Verification</span>
              <MaterialIcon name="arrow_forward" size="18px" className="btn-icon-arrow" />
            </>
          )}
        </button>
      </div>


    </>
  );
}

/* ═══ Step 2: OTP Verification ═══ */
function StepOTP({ form, otp, onOtpChange, onVerify, onResend, onBack, verifying, resendCooldown }) {
  const inputRefs = useRef([]);

  const handleChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    onOtpChange(index, value);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    pasted.split("").forEach((char, i) => onOtpChange(i, char));
    const nextEmpty = Math.min(pasted.length, 5);
    inputRefs.current[nextEmpty]?.focus();
  };

  return (
    <div className="otp-step-content">
      {/* Email Illustration */}
      <div className="otp-illustration">
        <div className="otp-icon-ring">
          <div className="otp-icon-pulse" />
          <svg className="otp-email-svg" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="12" width="36" height="26" rx="6" fill="#e7eeff" />
            <path d="M6 16L22.28 26.85C23.33 27.55 24.67 27.55 25.72 26.85L42 16" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="34" cy="30" r="9" fill="#006b5f" />
            <path d="M31.5 30L33.5 32L37 28.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="otp-icon-dot" />
        </div>
      </div>

      <div className="step-header centered">
        <h1>Verify your email address</h1>
        <p>
          We've sent a 6-digit verification code to{" "}
          <span className="email-highlight">{form.email || "your email"}</span>
        </p>
        <button type="button" className="change-email-btn" onClick={onBack}>
          <MaterialIcon name="edit" size="14px" />
          <span>Change email</span>
        </button>
      </div>

      {/* OTP Inputs */}
      <div className="otp-container">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            className={`otp-input${digit ? " filled" : ""}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            autoFocus={i === 0}
            aria-label={`OTP digit ${i + 1}`}
          />
        ))}
      </div>

      {/* Resend */}
      <div className="resend-link">
        <span>Didn't receive the code?</span>
        <button
          type="button"
          onClick={onResend}
          disabled={resendCooldown > 0}
          className="resend-btn"
        >
          <MaterialIcon name="refresh" size="16px" className={resendCooldown > 0 ? "" : "resend-icon-active"} />
          {resendCooldown > 0
            ? `Resend OTP (in 0:${resendCooldown < 10 ? "0" : ""}${resendCooldown}s)`
            : "Resend code"}
        </button>
      </div>

      {/* CTA */}
      <div className="btn-group">
        <button
          type="button"
          className="btn-primary"
          onClick={onVerify}
          disabled={verifying || otp.some((d) => !d)}
        >
          {verifying ? <span className="btn-spinner" /> : (
            <>
              <span>Verify & Continue</span>
              <MaterialIcon name="arrow_forward" size="18px" className="btn-icon-arrow" />
            </>
          )}
        </button>
        <button type="button" className="btn-ghost" onClick={onBack}>
          <MaterialIcon name="arrow_back" size="18px" />
          <span>Back to previous step</span>
        </button>
      </div>

      {/* Security Badge */}
      <div className="security-badge">
        <MaterialIcon name="verified_user" size="18px" filled className="security-badge-icon" />
        <span>End-to-end 256-bit encrypted identity verification</span>
      </div>
    </div>
  );
}

/* ═══ Step 3: Additional Info ═══ */
function StepAdditionalInfo({ form, onChange, onNext, onBack, errors }) {
  return (
    <>
      {/* Header */}
      <div className="step-header centered">
        <div className="profile-illustration">
          <div className="profile-icon-ring">
            <MaterialIcon name="person_add" size="32px" className="profile-icon" />
          </div>
        </div>
        <h1>Complete your profile</h1>
        <p>Help us personalize your experience</p>
      </div>

      {/* Phone */}
      <div className="form-group">
        <label className="form-label" htmlFor="phone">Phone Number</label>
        <div className="input-wrapper has-icon">
          <span className="input-icon">
            <MaterialIcon name="phone" size="20px" />
          </span>
          <input
            id="phone"
            className={`form-input${errors.phone ? " error" : ""}`}
            type="tel"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            autoComplete="tel"
          />
        </div>
        {errors.phone && <span className="form-error">{errors.phone}</span>}
      </div>

      {/* Role Selector */}
      <div className="role-section">
        <p className="role-section-title">What best describes you?</p>
        <div className="role-grid">
          {ROLES.map((role) => (
            <div
              key={role.id}
              className={`role-card${form.role === role.id ? " selected" : ""}`}
              onClick={() => onChange("role", role.id)}
              role="radio"
              aria-checked={form.role === role.id}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onChange("role", role.id)}
            >
              <div className="role-check">
                <MaterialIcon name="check" size="14px" filled />
              </div>
              <div className="role-icon-wrap">
                <MaterialIcon name={role.icon} size="28px" className="role-icon-material" />
              </div>
              <span className="role-label">{role.label}</span>
              <span className="role-desc">{role.desc}</span>
            </div>
          ))}
        </div>
        {errors.role && <span className="form-error" style={{ marginBottom: "0.5rem", display: "block" }}>{errors.role}</span>}
      </div>

      <div className="btn-group">
        <button type="button" className="btn-primary" onClick={onNext}>
          <span>Continue to Review</span>
          <MaterialIcon name="arrow_forward" size="18px" className="btn-icon-arrow" />
        </button>
        <button type="button" className="btn-ghost" onClick={onBack}>
          <MaterialIcon name="arrow_back" size="18px" />
          <span>Back to previous step</span>
        </button>
      </div>
    </>
  );
}

/* ═══ Step 4: Confirm ═══ */
function StepConfirm({ form, agreed, onAgreeChange, onSubmit, onBack, submitting }) {
  const roleLabel = ROLES.find((r) => r.id === form.role)?.label || "—";

  const summaryItems = [
    { icon: "person", label: "Full Name", value: `${form.firstName} ${form.lastName}` },
    { icon: "mail", label: "Email", value: form.email },
    { icon: "phone", label: "Phone", value: form.phone || "—" },
    { icon: "badge", label: "Role", value: roleLabel },
  ];

  return (
    <>
      <div className="step-header centered">
        <div className="confirm-illustration">
          <div className="confirm-icon-ring">
            <MaterialIcon name="fact_check" size="32px" className="confirm-icon" />
          </div>
        </div>
        <h1>Review & confirm</h1>
        <p>Make sure everything looks good before creating your account</p>
      </div>

      <div className="summary-card">
        {summaryItems.map((item, i) => (
          <div className="summary-row" key={i}>
            <div className="summary-row-left">
              <MaterialIcon name={item.icon} size="18px" className="summary-icon" />
              <span className="summary-row-label">{item.label}</span>
            </div>
            <span className="summary-row-value">{item.value}</span>
          </div>
        ))}
      </div>

      <label className="terms-checkbox">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => onAgreeChange(e.target.checked)}
        />
        <span className="terms-text">
          I agree to the{" "}
          <a href="#terms" onClick={(e) => e.preventDefault()}>Terms & Conditions</a>{" "}
          and{" "}
          <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
        </span>
      </label>

      <div className="btn-group">
        <button
          type="button"
          className="btn-primary btn-create"
          onClick={onSubmit}
          disabled={!agreed || submitting}
        >
          {submitting ? <span className="btn-spinner" /> : (
            <>
              <MaterialIcon name="check_circle" size="18px" />
              <span>Create Account</span>
            </>
          )}
        </button>
        <button type="button" className="btn-ghost" onClick={onBack}>
          <MaterialIcon name="arrow_back" size="18px" />
          <span>Back to previous step</span>
        </button>
      </div>
    </>
  );
}

/* ═══ Success Screen ═══ */
function SuccessScreen({ onContinue, form }) {
  return (
    <div className="success-screen">
      <div className="success-icon-wrap">
        <div className="success-rings">
          <div className="success-ring ring-1" />
          <div className="success-ring ring-2" />
        </div>
        <div className="success-circle">
          <MaterialIcon name="check" size="40px" filled />
        </div>
      </div>
      <h2>Welcome aboard, {form.firstName}!</h2>
      <p>Your account has been successfully created. You're all set to get started.</p>
      <div className="success-badges">
        <div className="success-badge-item">
          <MaterialIcon name="task_alt" size="20px" />
          <span>Account Verified</span>
        </div>
        <div className="success-badge-item">
          <MaterialIcon name="security" size="20px" />
          <span>Profile Secured</span>
        </div>
      </div>
      <button type="button" className="btn-primary" onClick={onContinue}>
        <span>Go to Dashboard</span>
        <MaterialIcon name="arrow_forward" size="18px" className="btn-icon-arrow" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════
   Main Signup Component
   ═══════════════════════════════════════ */
export default function Signup({ isEmbedded, onNavigate }) {
  const [signupGate, setSignupGate] = useState("choose"); // choose | email
  const [step, setStep] = useState(1);
  const [animClass, setAnimClass] = useState("slide-in-right");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    role: "",
  });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [errors, setErrors] = useState({});
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [success, setSuccess] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");

  const { register, verifyOtp, resendOtp, updateProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const cooldownRef = useRef(null);

  const showStepper = signupGate === "email";
  const contentKey = signupGate === "choose" ? "choose" : `step-${step}`;

  // Cleanup cooldown timer
  useEffect(() => () => clearInterval(cooldownRef.current), []);

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  const updateOtp = useCallback((index, value) => {
    setOtp((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  /* ── Navigation helpers ── */
  const goForward = (nextStep) => {
    setAnimClass("slide-out-left");
    setTimeout(() => {
      setStep(nextStep);
      setAnimClass("slide-in-right");
    }, 250);
  };

  const goBack = (prevStep) => {
    setAnimClass("slide-out-right");
    setTimeout(() => {
      setStep(prevStep);
      setAnimClass("slide-in-left");
    }, 250);
  };

  const openEmailPath = () => {
    setAnimClass("slide-out-left");
    setTimeout(() => {
      setSignupGate("email");
      setStep(1);
      setErrors({});
      setAnimClass("slide-in-right");
    }, 250);
  };

  const backToChoose = () => {
    setAnimClass("slide-out-right");
    setTimeout(() => {
      setSignupGate("choose");
      setStep(1);
      setErrors({});
      setAnimClass("slide-in-left");
    }, 250);
  };

  const handleGoogleSignup = () => {
    alert("Google Sign-In coming soon!");
  };

  /* ── Validation ── */
  const validateStep1 = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email";
    if (!form.password) errs.password = "Password is required";
    else if (form.password.length < 8) errs.password = "Min. 8 characters";
    if (!form.confirmPassword) errs.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords don't match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    const errs = {};
    if (!form.phone.trim()) errs.phone = "Phone number is required";
    if (!form.role) errs.role = "Please select your role";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── Step handlers ── */
  const handleStep1Next = async () => {
    if (validateStep1()) {
      setLoading(true);
      try {
        const payload = {
          owner: {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            password: form.password
          }
        };
        const res = await register(payload);
        setVerificationToken(res.verification_token);

        setResendCooldown(42);
        clearInterval(cooldownRef.current);
        cooldownRef.current = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(cooldownRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        goForward(2);
      } catch (err) {
        console.error("Registration failed:", err);
        toast.push(err?.message || "Signup failed — email may already exist", { type: "error" });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleVerifyOtp = async () => {
    setVerifying(true);
    try {
      await verifyOtp({
        verificationToken,
        otp: otp.join(""),
        purpose: "signup"
      });
      toast.push("Email verified successfully!", { type: "success" });
      goForward(3);
    } catch (err) {
      console.error("OTP Verification failed:", err);
      const refreshed = err?.body?.verification_token;
      if (refreshed) setVerificationToken(refreshed);
      toast.push(err?.message || "Invalid or expired OTP", { type: "error" });
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const res = await resendOtp({ email: form.email, purpose: "signup" });
      setVerificationToken(res.verification_token);
      
      setResendCooldown(42);
      toast.push("OTP resent to your email", { type: "success" });
      clearInterval(cooldownRef.current);
      cooldownRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      toast.push(err?.message || "Failed to resend OTP", { type: "error" });
    }
  };

  const handleStep3Next = () => {
    if (validateStep3()) goForward(4);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      await updateProfile({
        phone: form.phone,
        persona: form.role,
        acceptedTerms: agreed
      });
      setSuccess(true);
      toast.push("Account created successfully!", { type: "success" });
    } catch (err) {
      console.error("Profile update failed:", err);
      toast.push(err?.message || "Failed to complete profile", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  /* ── Render ── */
  if (success) {
    return (
      <div className={isEmbedded ? "w-full h-full flex flex-col relative" : "signup-page"}>
        {/* Header */}
        {!isEmbedded && (
          <header className="signup-header">
            <div className="signup-header-inner">
              <div className="header-brand">
                <span className="header-logo-text">Nexus</span>
                <span className="header-badge">Account Setup</span>
              </div>
            </div>
          </header>
        )}

        <main className={isEmbedded ? "signup-main-embedded" : "signup-main"}>
          <div className={isEmbedded ? "signup-card-embedded" : "signup-card"}>
            <SuccessScreen form={form} onContinue={() => navigate("/dashboard")} />
          </div>
        </main>

        {!isEmbedded && (
          <footer className="signup-footer-bar">
            <FooterContent />
          </footer>
        )}
      </div>
    );
  }

  return (
    <div className={isEmbedded ? "w-full h-full flex flex-col relative" : "signup-page"}>
      {/* Ambient background glow */}
      {!isEmbedded && <div className="ambient-glow" />}

      {/* Header */}
      {!isEmbedded && (
        <header className="signup-header">
          <div className="signup-header-inner">
            <div className="header-brand">
              <span className="header-logo-text">Nexus</span>
              <span className="header-badge">Account Setup</span>
            </div>
            <div className="header-right">
              <nav className="header-nav">
                <Link to="/login" className="header-nav-link">
                  Already have an account? Sign in
                </Link>
              </nav>
              <div className="header-avatar">
                <MaterialIcon name="person" size="18px" />
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main */}
      <main className={isEmbedded ? "signup-main-embedded" : "signup-main"}>
        <div className="signup-content-wrapper">
          {/* Background radial */}
          <div className="radial-bg" />

          {/* Stepper — only after email path starts */}
          {showStepper ? <Stepper currentStep={step} /> : null}

          {/* Card */}
          <div className={isEmbedded ? "signup-card-embedded" : "signup-card"}>
            <div className={`step-content ${animClass}`} key={contentKey}>
              {signupGate === "choose" && (
                <StepChooseMethod
                  onGoogle={handleGoogleSignup}
                  onEmail={openEmailPath}
                />
              )}

              {signupGate === "email" && step === 1 && (
                <StepBasicInfo
                  form={form}
                  onChange={updateField}
                  onNext={handleStep1Next}
                  onBack={backToChoose}
                  errors={errors}
                  submitting={loading}
                />
              )}

              {signupGate === "email" && step === 2 && (
                <StepOTP
                  form={form}
                  otp={otp}
                  onOtpChange={updateOtp}
                  onVerify={handleVerifyOtp}
                  onResend={handleResendOtp}
                  onBack={() => goBack(1)}
                  verifying={verifying}
                  resendCooldown={resendCooldown}
                />
              )}

              {signupGate === "email" && step === 3 && (
                <StepAdditionalInfo
                  form={form}
                  onChange={updateField}
                  onNext={handleStep3Next}
                  onBack={() => goBack(2)}
                  errors={errors}
                />
              )}

              {signupGate === "email" && step === 4 && (
                <StepConfirm
                  form={form}
                  agreed={agreed}
                  onAgreeChange={setAgreed}
                  onSubmit={handleFinalSubmit}
                  onBack={() => goBack(3)}
                  submitting={loading}
                />
              )}
            </div>
          </div>


        </div>
      </main>

      {/* Footer */}
      {!isEmbedded && (
        <footer className="signup-footer-bar">
          <FooterContent />
        </footer>
      )}
    </div>
  );
}

/* ═══ Footer ═══ */
function FooterContent() {
  return (
    <div className="footer-inner">
      <span className="footer-copyright">© 2025 Nexus Technologies Inc. All rights reserved.</span>
      <div className="footer-badges">
        <div className="footer-badge">
          <MaterialIcon name="lock" size="16px" className="footer-badge-icon secondary" />
          <span>256-bit SSL</span>
        </div>
        <div className="footer-badge">
          <MaterialIcon name="verified_user" size="16px" className="footer-badge-icon primary" />
          <span>SOC-2 Compliant</span>
        </div>
        <div className="footer-badge">
          <MaterialIcon name="shield" size="16px" className="footer-badge-icon secondary" />
          <span>Privacy Guaranteed</span>
        </div>
      </div>
    </div>
  );
}
