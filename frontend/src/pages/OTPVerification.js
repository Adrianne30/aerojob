import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, RotateCcw, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Logo from '../components/Logo';

const OTPVerification = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { verifyOTP, resendOTP } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const { email, userId } = location.state || {};

  useEffect(() => {
    if (!email || !userId) {
      navigate('/register');
    }
  }, [email, userId, navigate]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only allow numbers

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus to next input
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }

    // Auto-submit when all digits are entered
    if (newOtp.every(digit => digit !== '') && index === 5) {
      handleSubmit();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      const newOtp = [...otp];
      digits.forEach((digit, idx) => {
        if (idx < 6) newOtp[idx] = digit;
      });
      setOtp(newOtp);
      if (digits.length === 6) document.getElementById('otp-5').focus();
    }
  };

  const handleSubmit = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyOTP(email, otpCode);
      if (result.success) {
        navigate('/dashboard');
      }
    } catch (error) {
      // handled in context
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    try {
      await resendOTP(email);
      setResendCooldown(60); // 60 seconds cooldown
    } catch (error) {
      // handled in context
    }
  };

  if (!email || !userId) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo size={100} /> {/* ✅ PhilSCA Logo at top */}
        </div>
        <h2 className="mt-6 text-center text-3xl font-heading font-bold text-gray-900">
          Verify Your Email
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          We've sent a 6-digit code to{' '}
          <span className="font-medium text-primary-600">{email}</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* OTP Input */}
          <div className="space-y-6">
            <div>
              <label className="form-label text-center block">
                Enter verification code
              </label>
              <div className="flex justify-center space-x-2 mt-4">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>

            {/* Resend OTP */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0 || isLoading}
                className="inline-flex items-center text-sm text-primary-600 hover:text-primary-500 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : 'Resend code'}
              </button>
            </div>

            {/* Submit Button */}
            <div>
              <button
                onClick={handleSubmit}
                disabled={otp.join('').length !== 6 || isLoading}
                className="w-full btn btn-primary btn-lg flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <LoadingSpinner size="small" text="" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Verify Email</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex">
              <Mail className="h-5 w-5 text-blue-400 mr-3" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">Didn't receive the email?</p>
                <p className="mt-1">
                  Check your spam folder or click "Resend code" to send a new verification code.
                </p>
              </div>
            </div>
          </div>

          {/* Email Info */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Verifying email for: <span className="font-medium">{email}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
