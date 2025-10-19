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
                Welcome to <strong>AeroJob</strong>. By accessing or using our
                platform, you agree to comply with these Terms and Conditions.
              </p>
              <h3 className="mt-4 font-semibold text-[#052940]">1. Use of the Platform</h3>
              <p>
                AeroJob provides internship and job-matching services for
                PhilSCA students and alumni. You agree to use the platform
                responsibly and for lawful purposes.
              </p>
              <h3 className="mt-4 font-semibold text-[#052940]">2. Account Responsibility</h3>
              <p>
                You are responsible for your login credentials. AeroJob is not
                liable for damages from unauthorized account access.
              </p>
              <h3 className="mt-4 font-semibold text-[#052940]">3. Data Accuracy</h3>
              <p>
                You agree to provide accurate and truthful information.
                Misrepresentation may result in account suspension.
              </p>
              <h3 className="mt-4 font-semibold text-[#052940]">4. Intellectual Property</h3>
              <p>
                All AeroJob logos, text, and data are protected by copyright
                laws.
              </p>
              <p className="mt-4">
                For questions, contact us at{" "}
                <a
                  href="mailto:support@aerojob.space"
                  className="text-blue-600 hover:underline"
                >
                  support@aerojob.space
                </a>
                .
              </p>
            </>
          ) : (
            <>
              <p>
                At <strong>AeroJob</strong>, your privacy matters. This Privacy
                Policy explains how we collect, use, and protect your data.
              </p>
              <h3 className="mt-4 font-semibold text-[#052940]">
                1. Information We Collect
              </h3>
              <p>
                We collect your name, email, course, and job application details
                when you create an account or apply for opportunities.
              </p>
              <h3 className="mt-4 font-semibold text-[#052940]">
                2. Data Protection
              </h3>
              <p>
                We use encryption and security measures to protect your personal
                data from unauthorized access or disclosure.
              </p>
              <h3 className="mt-4 font-semibold text-[#052940]">
                3. Data Usage
              </h3>
              <p>
                Your data is used to match you with internship and job
                opportunities, improve services, and communicate updates.
              </p>
              <h3 className="mt-4 font-semibold text-[#052940]">
                4. Contact Us
              </h3>
              <p>
                For inquiries, email{" "}
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

/* -------------------------------- Register -------------------------------- */
const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // ✅ for terms/privacy modals

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
        firstName: (data.firstName || "").trim(),
        lastName: (data.lastName || "").trim(),
        email: emailValue,
        password: data.password,
        userType: data.userType || "student",
        course: (data.course || "").trim(),
        yearLevel: data.yearLevel || "",
        studentId:
          data.userType === "student" ? (data.studentId || "").trim() : undefined,
      };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "" || payload[k] == null) delete payload[k];
      });

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo size={100} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-heading font-bold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{" "}
          <Link
            to="/login"
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            sign in to your existing account
          </Link>
        </p>
      </div>

      {/* Registration Form */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Other input fields here ... */}

            {/* Terms Checkbox */}
            <div className="flex items-center">
              <input
                id="terms"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                {...register("terms", { required: "You must accept the terms and conditions" })}
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
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

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn btn-primary btn-lg flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <LoadingSpinner size="small" text="" />
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* OTP & Legal Modals */}
      <OTPModal
        email={emailValue}
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        onVerified={afterVerified}
      />
      <LegalModal
        type={activeModal}
        open={!!activeModal}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
};

export default Register;
