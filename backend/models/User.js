// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  /* -------------------- Basic Information -------------------- */
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true, // ✅ Ensures no duplicates
    lowercase: true, // ✅ Always saved in lowercase
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },

  /* -------------------- User Type -------------------- */
  userType: {
    type: String,
    enum: ['student', 'alumni', 'admin'],
    required: true,
    default: 'student'
  },

  /* ---------------- Student / Alumni Fields ---------------- */
  studentId: {
    type: String,
    sparse: true, // ✅ Prevents null/empty unique conflicts
    unique: true
  },
  course: { type: String, trim: true },
  yearLevel: {
    type: String,
    enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate']
  },
  graduationYear: { type: Number },
  currentEmployer: { type: String, trim: true },
  position: { type: String, trim: true },

  /* -------------------- Contact Information -------------------- */
  phoneNumber: { type: String, trim: true },
  address: { type: String, trim: true },

  /* -------------------- Profile Information -------------------- */
  profilePicture: { type: String, default: '' },
  bio: { type: String, maxlength: 500 },
  skills: [{ type: String, trim: true }],

  /* -------------------- Verification Status -------------------- */
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpires: Date,

  /* -------------------- Password Reset -------------------- */
  resetPasswordToken: String,
  resetPasswordExpires: Date,

  /* -------------------- OTP (secure) -------------------- */
  otpHash: { type: String },
  otpExpiresAt: { type: Date },
  otpAttempts: { type: Number, default: 0 },

  /* -------------------- Account Status -------------------- */
  isActive: { type: Boolean, default: true },
  lastLogin: Date
}, {
  timestamps: true
});

/* ============================================================
   🧹 INDEXES (CLEAN + FIXED)
   ============================================================ */
// Removed duplicate email index to prevent conflicts
// Unique constraints already handled by schema options above

userSchema.index({ userType: 1 });
userSchema.index({ isActive: 1 });

/* ============================================================
   🔒 PASSWORD HOOKS
   ============================================================ */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/* ============================================================
   🔑 INSTANCE METHODS
   ============================================================ */
// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate 6-digit OTP, hash, and save expiry
userSchema.methods.generateOTP = async function (ttlMinutes = 10) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  this.otpHash = await bcrypt.hash(code, 10);
  this.otpExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  this.otpAttempts = 0;
  return code;
};

// Validate OTP with hash, expiry, and attempt limit
userSchema.methods.validateOTP = async function (code, maxAttempts = 5) {
  if (!this.otpHash || !this.otpExpiresAt) return { ok: false, error: 'NO_OTP' };
  if (this.otpAttempts >= maxAttempts) return { ok: false, error: 'TOO_MANY_ATTEMPTS' };
  if (new Date() > this.otpExpiresAt) return { ok: false, error: 'EXPIRED' };

  const match = await bcrypt.compare(String(code), this.otpHash);
  this.otpAttempts += 1;

  if (!match) return { ok: false, error: 'INVALID' };
  return { ok: true };
};

// Clear OTP data
userSchema.methods.clearOTP = function () {
  this.otpHash = undefined;
  this.otpExpiresAt = undefined;
  this.otpAttempts = 0;
};

/* ============================================================
   🧾 CLEAN JSON OUTPUT (remove sensitive fields)
   ============================================================ */
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.otpHash;
  delete user.otpExpiresAt;
  delete user.otpAttempts;
  delete user.emailVerificationToken;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  return user;
};

module.exports = mongoose.model('User', userSchema);
