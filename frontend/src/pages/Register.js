// src/pages/Register.js
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
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
  XCircle
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import Logo from '../components/Logo';
import { authAPI, logApiBase } from '../utils/api';

/* ------------------------------- OTP Modal ------------------------------- */
function OTPModal({ email, open, onClose, onVerified }) {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [serverMsg, setServerMsg] = useState(null);

  useEffect(() => {
    if (!open) return;
    setCode('');
    setServerMsg(null);
    setCooldown(60);
    const t = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [open]);

  const verify = async () => {
    if (String(code).trim().length !== 6) {
      setServerMsg({ type: 'error', text: 'Enter the 6-digit code.' });
      return;
    }
    try {
      setVerifying(true);
      setServerMsg(null);
      // ✅ New API: expects { email, otp }
      const resp = await authAPI.verifyOTP({
        email: String(email || '').trim().toLowerCase(),
        otp: String(code).trim(),
      });
      // If your backend returns token/user you can use resp here
      setServerMsg({ type: 'success', text: 'Email verified.' });
      onVerified?.(resp);
    } catch (e) {
      setServerMsg({ type: 'error', text: e.message || 'Verification failed' });
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    try {
      setResending(true);
      setServerMsg(null);
      // ✅ New API: expects { email }
      await authAPI.resendOTP({ email: String(email || '').trim().toLowerCase() });
      setServerMsg({ type: 'success', text: 'OTP resent. Check your email.' });
      setCooldown(60);
    } catch (e) {
      setServerMsg({ type: 'error', text: e.message || 'Resend failed' });
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="mt-4 w-full border rounded px-3 py-2 tracking-widest text-center text-xl"
          placeholder="••••••"
        />

        {serverMsg && (
          <div
            className={`mt-3 flex items-center gap-2 text-sm ${
              serverMsg.type === 'error' ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {serverMsg.type === 'error'
              ? <XCircle className="w-4 h-4" />
              : <CheckCircle2 className="w-4 h-4" />}
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
              title={cooldown > 0 ? `Wait ${cooldown}s` : 'Resend code'}
            >
              <RotateCcw className="w-4 h-4" />
              {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Resending…' : 'Resend OTP'}
            </button>

            <button
              onClick={verify}
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              disabled={verifying}
            >
              {verifying ? 'Verifying…' : 'Verify'}
            </button>
          </div>
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

  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setError,
  } = useForm({ defaultValues: { userType: 'student' } });

  useEffect(() => {
    logApiBase(); // will log resolved API base/root
  }, []);

  const password = watch('password');
  const userType = watch('userType');
  const emailValue = (watch('email') || '').trim().toLowerCase();

  const onSubmit = async (data) => {
    setIsLoading(true);
    setFormError(null);
    try {
      const payload = {
        firstName: (data.firstName || '').trim(),
        lastName: (data.lastName || '').trim(),
        email: emailValue,
        password: data.password,
        userType: data.userType || 'student',
        course: (data.course || '').trim(),
        yearLevel: data.yearLevel || '',
        studentId: data.userType === 'student' ? (data.studentId || '').trim() : undefined,
      };
      // remove empty keys
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '' || payload[k] == null) delete payload[k];
      });

      const reg = await authAPI.register(payload);
      // If email send failed server-side, transparently resend now
      if (reg?.mailError) {
        try { await authAPI.resendOTP({ email: payload.email }); } catch (_) {}
      }
      if (reg?.requiresVerification !== false) {
        // Normal path: open modal for user to enter code
        setOtpOpen(true);
      } else {
        // (Fallback) If verification is somehow not required
        navigate('/login', { replace: true, state: { justRegistered: true } });
      }
    } catch (error) {
      console.error('Registration failed:', error);
      setError('root', { type: 'manual', message: error?.message || 'Registration failed' });
      setFormError(error?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Called after OTP verified successfully
  const afterVerified = () => {
    setOtpOpen(false);
    navigate('/login', { replace: true, state: { justVerified: true } });
  };

  const userTypes = [
    { value: 'student', label: 'Student', icon: BookOpen },
    { value: 'alumni', label: 'Alumni', icon: GraduationCap },
  ];

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
          Or{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
            sign in to your existing account
          </Link>
        </p>
      </div>

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
                      className="relative flex cursor-pointer rounded-lg border border-gray-300 bg-white p-4 focus:outline-none hover:border-primary-500 has-[:checked]:border-primary-600 has-[:checked]:ring-2 has-[:checked]:ring-primary-600"
                    >
                      <input
                        type="radio"
                        value={type.value}
                        className="sr-only"
                        {...register('userType', { required: 'Please select your user type' })}
                        defaultChecked={type.value === 'student'}
                      />
                      <div className="flex flex-col items-center">
                        <Icon className="h-6 w-6 text-gray-400" />
                        <span className="mt-2 text-sm font-medium text-gray-900">{type.label}</span>
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
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="firstName"
                  type="text"
                  className="input pl-10"
                  placeholder="Enter your first name"
                  {...register('firstName', {
                    required: 'First name is required',
                    minLength: { value: 2, message: 'First name must be at least 2 characters' },
                    maxLength: { value: 50, message: 'First name must be less than 50 characters' },
                  })}
                />
              </div>
              {errors.firstName && <p className="form-error">{errors.firstName.message}</p>}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="form-label">Last Name</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 left pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="lastName"
                  type="text"
                  className="input pl-10"
                  placeholder="Enter your last name"
                  {...register('lastName', {
                    required: 'Last name is required',
                    minLength: { value: 2, message: 'Last name must be at least 2 characters' },
                    maxLength: { value: 50, message: 'Last name must be less than 50 characters' },
                  })}
                />
              </div>
              {errors.lastName && <p className="form-error">{errors.lastName.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="form-label">Email address</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="input pl-10"
                  placeholder="Enter your email (must be @philsca.edu.ph)"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Za-z0-9._%+-]+@philsca\.edu\.ph$/,
                      message: 'Only @philsca.edu.ph emails are allowed',
                    },
                  })}
                />
              </div>
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            {/* Student ID (students only) */}
            <div>
              <label htmlFor="studentId" className="form-label">Student ID (for students only)</label>
              <input
                id="studentId"
                type="text"
                className="input"
                placeholder="Enter your student ID"
                {...register('studentId', {
                  required: userType === 'student' ? 'Student ID is required for students' : false,
                })}
              />
              {errors.studentId && <p className="form-error">{errors.studentId.message}</p>}
            </div>

            {/* Course */}
            <div>
              <label htmlFor="course" className="form-label">Course</label>
              <select
                id="course"
                className="input"
                {...register('course', {
                  required: userType === 'student' ? 'Course is required for students' : false,
                })}
              >
                <option value="">Select your course</option>
                <optgroup label="INSTITUTE OF ENGINEERING AND TECHNOLOGY">
                  <option value="BS in Aeronautical Engineering">BS in Aeronautical Engineering</option>
                  <option value="BS in Air Transportation Major in Advance Flying">BS in Air Transportation Major in Advance Flying</option>
                  <option value="BS in Aircraft Maintenance Technology">BS in Aircraft Maintenance Technology</option>
                  <option value="BS in Aviation Electronics Technology">BS in Aviation Electronics Technology</option>
                  <option value="Associate in Aircraft Maintenance Technology">Associate in Aircraft Maintenance Technology</option>
                  <option value="Associate in Aviation Electronics Technology">Associate in Aviation Electronics Technology</option>
                </optgroup>
                <optgroup label="INSTITUTE OF LIBERAL ARTS AND SCIENCES">
                  <option value="BS in Aviation Communication Major in Flight Operations">BS in Aviation Communication Major in Flight Operations</option>
                  <option value="BS in Aviation Tourism Major in Travel Management">BS in Aviation Tourism Major in Travel Management</option>
                  <option value="BS in Supply Management with Specialization in Aviation Logistics">BS in Supply Management with Specialization in Aviation Logistics</option>
                  <option value="BS in Aviation Safety and Security Management">BS in Aviation Safety and Security Management</option>
                </optgroup>
                <optgroup label="INSTITUTE OF COMPUTER STUDIES">
                  <option value="BS in Information Technology with Specialization in Aviation Information Technology">BS in Information Technology with Specialization in Aviation Information Technology</option>
                  <option value="BS in Information System with Specialization in Aviation Information System">BS in Information System with Specialization in Aviation Information System</option>
                </optgroup>
                <optgroup label="INSTITUTE OF GRADUATE STUDIES">
                  <option value="Master of Education in Aeronautical Management">Master of Education in Aeronautical Management</option>
                  <option value="Master in Public Administration Major in Government and Airport Administration">Master in Public Administration Major in Government and Airport Administration</option>
                </optgroup>
              </select>
              {errors.course && <p className="form-error">{errors.course.message}</p>}
            </div>

            {/* Year Level */}
            <div>
              <label htmlFor="yearLevel" className="form-label">Year Level</label>
              <select
                id="yearLevel"
                className="input"
                {...register('yearLevel', {
                  required: userType === 'student' ? 'Year level is required for students' : false,
                })}
              >
                <option value="">Select year level</option>
                <option value="4th Year">4th Year</option>
                <option value="Graduate">Graduate</option>
              </select>
              {errors.yearLevel && <p className="form-error">{errors.yearLevel.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="form-label">Password</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-10 pr-10"
                  placeholder="Create a password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' },
                  })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="input pl-10 pr-10"
                  placeholder="Confirm your password"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) => value === password || 'Passwords do not match',
                  })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="form-error">{errors.confirmPassword.message}</p>}
            </div>

            {/* Terms */}
            <div className="flex items-center">
              <input
                id="terms"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                {...register('terms', { required: 'You must accept the terms and conditions' })}
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                I agree to the{' '}
                <Link to="/terms" className="text-primary-600 hover:text-primary-500">Terms and Conditions</Link> and{' '}
                <Link to="/privacy" className="text-primary-600 hover:text-primary-500">Privacy Policy</Link>
              </label>
            </div>
            {errors.terms && <p className="form-error">{errors.terms.message}</p>}

            {/* Error Message */}
            {(errors.root || formError) && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Lock className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      {errors.root?.message || formError}
                    </h3>
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
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

      {/* OTP Modal */}
      <OTPModal
        email={emailValue}
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        onVerified={afterVerified}
      />
    </div>
  );
};

export default Register;
