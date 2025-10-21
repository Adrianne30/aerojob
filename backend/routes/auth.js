// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/* ============================================================
   🚀 AUTH ROUTES (AEROJOB)
   ============================================================ */

/**
 * @route   POST /api/auth/register
 * @desc    Register new user and send OTP to email
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP after registration
 */
router.post('/verify-otp', authController.verifyOTP);

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP if the user didn't receive it or it expired
 */
router.post('/resend-otp', authController.resendOTP);

/**
 * @route   POST /api/auth/login
 * @desc    Login user (requires verified email)
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset link to user's email
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset user password using the reset token
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @route   GET /api/auth/profile
 * @desc    Get the currently logged-in user's profile
 * @access  Protected (requires JWT)
 */
router.get('/profile', authController.getProfile);

module.exports = router;
