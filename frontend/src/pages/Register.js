import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  BookOpen,
  GraduationCap,
  UserPlus,
  RotateCcw,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import Logo from "../components/Logo";
import { authAPI, logApiBase } from "../utils/api";
import logo from "../assets/philsca_logo.png";

/* ------------------------------- OTP Modal ------------------------------- */
function OTPModal({ email, open, onClose, onVerified }) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [serverMsg, setServerMsg] = useState(null);

  useEffect(() => {
    if (!open) return;
    setCode("");
    setServerMsg(null);
    setCooldown(60);
    const t = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [open]);

  const verify = async () => {
    if (String(code).trim().length !== 6) {
      setServerMsg({ type: "error", text: "Enter the 6-digit code." });
      return;
    }
    try {
      setVerifying(true);
      setServerMsg(null);
      const resp = await authAPI.verifyOTP({
        email: String(email || "").trim().toLowerCase(),
        otp: String(code).trim(),
      });
      setServerMsg({ type: "success", text: "Email verified." });
      onVerified?.(resp);
    } catch (e) {
      setServerMsg({ type: "error", text: e.message || "Verification failed" });
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    try {
      setResending(true);
      setServerMsg(null);
      await authAPI.resendOTP({ email: String(email || "").trim().toLowerCase() });
      setServerMsg({ type: "success", text: "OTP resent. Check your email." });
      setCooldown(60);
    } catch (e) {
      setServerMsg({ type: "error", text: e.message || "Resend failed" });
    } finally {
      setResending(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">Verify your email</h3>
            <p className="text-sm text-gray-600 mt-1">
              We sent a 6-digit code to <b>{email}</b>. Enter it below.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="mt-4 w-full border rounded px-3 py-2 tracking-widest text-center text-xl"
          placeholder="••••••"
        />

        {serverMsg && (
          <div
            className={`mt-3 flex items-center gap-2 text-sm ${
              serverMsg.type === "error" ? "text-red-600" : "text-green-600"
            }`}
          >
            {serverMsg.type === "error" ? (
              <XCircle className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{serverMsg.text}</span>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <button onClick={onClose} className="px-3 py-2 rounded border text-gray-700">
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={resend}
              className="px-3 py-2 rounded border flex items-center gap-1 disabled:opacity-50"
              disabled={cooldown > 0 || resending}
              title={cooldown > 0 ? `Wait ${cooldown}s` : "Resend code"}
            >
              <RotateCcw className="w-4 h-4" />
              {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? "Resending…" : "Resend OTP"}
            </button>

            <button
              onClick={verify}
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              disabled={verifying}
            >
              {verifying ? "Verifying…" : "Verify"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------ Terms & Privacy Modal ------------------ */
function LegalModal({ type, open, onClose }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#052940] text-white flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="AeroJob Logo" className="h-8 w-8" />
            <h2 className="text-lg font-semibold">
              {type === "terms" ? "Terms and Conditions" : "Privacy Policy"}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[75vh] text-gray-700 text-sm leading-relaxed">
          {type === "terms" ? (
            <>
              <p>
                Welcome to <strong>AeroJob</strong>. By using our platform, you agree to comply
                with these Terms and Conditions.
              </p>
              <h3 className="mt-4 font-semibold text-[#052940]">1. Use of Platform</h3>
              <p>
                AeroJob provides job and internship listings for PhilSCA students and alumni.
                You agree to use it only for lawful and academic purposes.
              </p>
              <h3 className="mt-4 font-semibold text-[#052940]">2. Account Responsibility</h3>
              <p>You are responsible for maintaining the confidentiality of your login credentials.</p>
              <h3 className="mt-4 font-semibold text-[#052940]">3. Data Accuracy</h3>
              <p>Please ensure that all provided information is truthful and accurate.</p>
              <h3 className="mt-4 font-semibold text-[#052940]">4. Liability</h3>
              <p>AeroJob is not responsible for any third-party job postings or external content.</p>
            </>
          ) : (
            <>
              <p>
                At <strong>AeroJob</strong>, we value your privacy. This policy explains how we
                collect and protect your personal data.
              </p>
              <h3 className="mt-4 font-semibold text-[#052940]">1. What We Collect</h3>
              <p>
                We collect basic user data like name, email, course, and student ID to improve
                our services and match you with opportunities.
              </p>
              <h3 className="mt-4 font-semibold text-[#052940]">2. Data Protection</h3>
              <p>All data is stored securely and only accessible to authorized personnel.</p>
              <h3 className="mt-4 font-semibold text-[#052940]">3. Contact</h3>
              <p>
                For privacy inquiries, contact{" "}
                <a
                  href="mailto:support@aerojob.space"
                  className="text-blue-600 hover:underline"
                >
                  support@aerojob.space
                </a>
                .
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Register ----------------------------- */
const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [activeModal, setActiveModal] = useState(null);

  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setError,
  } = useForm({ defaultValues: { userType: "student" } });

  useEffect(() => {
    logApiBase();
  }, []);

  const password = watch("password");
  const emailValue = (watch("email") || "").trim().toLowerCase();

  const onSubmit = async (data) => {
    setIsLoading(true);
    setFormError(null);
    try {
      const payload = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: emailValue,
        password: data.password,
        userType: data.userType,
        course: data.course,
        yearLevel: data.yearLevel,
        studentId:
          data.userType === "student" ? (data.studentId || "").trim() : undefined,
      };
      const reg = await authAPI.register(payload);
      if (reg?.requiresVerification !== false) setOtpOpen(true);
      else navigate("/login", { replace: true, state: { justRegistered: true } });
    } catch (error) {
      setError("root", { type: "manual", message: error?.message || "Registration failed" });
      setFormError(error?.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const afterVerified = () => {
    setOtpOpen(false);
    navigate("/login", { replace: true, state: { justVerified: true } });
  };

  const userTypes = [
    { value: "student", label: "Student", icon: BookOpen },
    { value: "alumni", label: "Alumni", icon: GraduationCap },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo size={100} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{" "}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            sign in to your existing account
          </Link>
        </p>
      </div>

      {/* Form */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* User Type */}
            <div>
              <label className="form-label">I am a</label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {userTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <label
                      key={type.value}
                      className="relative flex cursor-pointer rounded-lg border border-gray-300 bg-white p-4 focus:outline-none hover:border-blue-500 has-[:checked]:border-blue-600 has-[:checked]:ring-2 has-[:checked]:ring-blue-600"
                    >
                      <input
                        type="radio"
                        value={type.value}
                        className="sr-only"
                        {...register("userType", { required: "Please select your user type" })}
                        defaultChecked={type.value === "student"}
                      />
                      <div className="flex flex-col items-center">
                        <Icon className="h-6 w-6 text-gray-400" />
                        <span className="mt-2 text-sm font-medium text-gray-900">
                          {type.label}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
              {errors.userType && <p className="form-error">{errors.userType.message}</p>}
            </div>

            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="form-label">First Name</label>
              <input
                id="firstName"
                type="text"
                className="input"
                placeholder="Enter your first name"
                {...register("firstName", { required: "First name is required" })}
              />
              {errors.firstName && <p className="form-error">{errors.firstName.message}</p>}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="form-label">Last Name</label>
              <input
                id="lastName"
                type="text"
                className="input"
                placeholder="Enter your last name"
                {...register("lastName", { required: "Last name is required" })}
              />
              {errors.lastName && <p className="form-error">{errors.lastName.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="form-label">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="Enter your @philsca.edu.ph email"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Za-z0-9._%+-]+@philsca\.edu\.ph$/,
                    message: "Only @philsca.edu.ph emails are allowed",
                  },
                })}
              />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            {/* Student ID */}
            <div>
              <label htmlFor="studentId" className="form-label">
                Student ID (students only)
              </label>
              <input
                id="studentId"
                type="text"
                className="input"
                placeholder="Enter your student ID"
                {...register("studentId", {})}
              />
            </div>

            {/* Course */}
            <div>
              <label htmlFor="course" className="form-label">Course</label>
              <select id="course" className="input" {...register("course")}>
                <option value="">Select your course</option>

                    <optgroup label="INSTITUTE OF ENGINEERING AND TECHNOLOGY">
                      <option value="BS in Aeronautical Engineering">
                        BS in Aeronautical Engineering
                      </option>
                      <option value="BS in Air Transportation Major in Advance Flying">
                        BS in Air Transportation Major in Advance Flying
                      </option>
                      <option value="BS in Aircraft Maintenance Technology">
                        BS in Aircraft Maintenance Technology
                      </option>
                      <option value="BS in Aviation Electronics Technology">
                        BS in Aviation Electronics Technology
                      </option>
                      <option value="Associate in Aircraft Maintenance Technology">
                        Associate in Aircraft Maintenance Technology
                      </option>
                      <option value="Associate in Aviation Electronics Technology">
                        Associate in Aviation Electronics Technology
                      </option>
                    </optgroup>

                    <optgroup label="INSTITUTE OF LIBERAL ARTS AND SCIENCES">
                      <option value="BS in Aviation Communication Major in Flight Operations">
                        BS in Aviation Communication Major in Flight Operations
                      </option>
                      <option value="BS in Aviation Tourism Major in Travel Management">
                        BS in Aviation Tourism Major in Travel Management
                      </option>
                      <option value="BS in Supply Management with Specialization in Aviation Logistics">
                        BS in Supply Management with Specialization in Aviation Logistics
                      </option>
                      <option value="BS in Aviation Safety and Security Management">
                        BS in Aviation Safety and Security Management
                      </option>
                    </optgroup>

                    <optgroup label="INSTITUTE OF COMPUTER STUDIES">
                      <option value="BS in Information Technology with Specialization in Aviation Information Technology">
                        BS in Information Technology with Specialization in Aviation Information Technology
                      </option>
                      <option value="BS in Information System with Specialization in Aviation Information System">
                        BS in Information System with Specialization in Aviation Information System
                      </option>
                    </optgroup>

                    <optgroup label="INSTITUTE OF GRADUATE STUDIES">
                      <option value="Master of Education in Aeronautical Management">
                        Master of Education in Aeronautical Management
                      </option>
                      <option value="Master in Public Administration Major in Government and Airport Administration">
                        Master in Public Administration Major in Government and Airport Administration
                      </option>
                    </optgroup>
              </select>
            </div>

            {/* Year Level */}
            <div>
              <label htmlFor="yearLevel" className="form-label">Year Level</label>
              <select id="yearLevel" className="input" {...register("yearLevel")}>
                <option value="">Select year level</option>
                <option value="4th Year">4th Year</option>
                <option value="Graduate">Graduate</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="form-label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="input pr-10"
                  {...register("password", { required: "Password is required" })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-2.5"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  className="input pr-10"
                  {...register("confirmPassword", {
                    required: "Please confirm your password",
                    validate: (value) => value === password || "Passwords do not match",
                  })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-2.5"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="form-error">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-center">
              <input
                id="terms"
                type="checkbox"
                className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                {...register("terms", { required: "You must accept the terms and conditions" })}
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-900">
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() => setActiveModal("terms")}
                  className="text-blue-600 hover:underline"
                >
                  Terms and Conditions
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  onClick={() => setActiveModal("privacy")}
                  className="text-blue-600 hover:underline"
                >
                  Privacy Policy
                </button>
              </label>
            </div>
            {errors.terms && <p className="form-error">{errors.terms.message}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary flex items-center justify-center gap-2"
            >
              {isLoading ? <LoadingSpinner size="small" /> : <><UserPlus className="w-5 h-5" />Create Account</>}
            </button>
          </form>
        </div>
      </div>

      {/* OTP + Modals */}
      <OTPModal email={emailValue} open={otpOpen} onClose={() => setOtpOpen(false)} onVerified={afterVerified} />
      <LegalModal type={activeModal} open={!!activeModal} onClose={() => setActiveModal(null)} />
    </div>
  );
};

export default Register;
