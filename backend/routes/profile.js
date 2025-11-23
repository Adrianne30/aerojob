const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const jwt = require("jsonwebtoken");

const Profile = require("../models/Profile");
const User = require("../models/User");

/* ======================================================
   AUTH MIDDLEWARE
   ====================================================== */
function requireAuth(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;

    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const payload = jwt.verify(token, process.env.JWT_SECRET || "devsecret");
    req.userId = payload.sub;
    req.userRole = payload.role;
    next();
  } catch (_) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/* ======================================================
   UPLOAD DIRECTORY
   ====================================================== */
const AVATAR_DIR = path.join(__dirname, "..", "uploads", "avatars");
fs.mkdirSync(AVATAR_DIR, { recursive: true });

/* ======================================================
   MULTER STORAGE
   ====================================================== */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, `u${req.userId}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

/* Build a public URL from local file */
function publicFileUrl(req, relPath) {
  const base =
    process.env.BACKEND_PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
  return `${base}/${relPath.replace(/^[\\/]+/, "")}`;
}

/* ======================================================
   GET /api/profile/me
   Auto-create profile if missing
   ====================================================== */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    let profile = await Profile.findOne({ user: user._id });

    if (!profile) {
      profile = await Profile.create({
        user: user._id,
        fullName: user.name || "",
        email: user.email || "",
        role: user.role || "student",
        avatarUrl: user.avatarUrl || "",
        bio: "",
        course: "",
        yearLevel: "",
        contactNumber: "",
        address: "",
        studentId: "",
      });
    }

    return res.json({ user, profile });
  } catch (err) {
    console.error("GET /profile/me error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ======================================================
   PUT /api/profile/me
   Update profile fields
   ====================================================== */
router.put("/me", requireAuth, async (req, res) => {
  try {
    const allowed = [
      "fullName",
      "email",
      "role",
      "avatarUrl",
      "bio",
      "course",
      "yearLevel",
      "contactNumber",
      "address",
      "studentId",
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] != null) updates[key] = req.body[key];
    }

    // Update Profile
    const profile = await Profile.findOneAndUpdate(
      { user: req.userId },
      { $set: updates },
      { new: true, upsert: true }
    );

    // Sync User model basic info (name, avatar, email)
    await User.findByIdAndUpdate(req.userId, {
      name: updates.fullName,
      email: updates.email,
      avatarUrl: updates.avatarUrl,
    });

    return res.json({ profile });
  } catch (err) {
    console.error("PUT /profile/me error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ======================================================
   POST /api/profile/picture
   Upload avatar + update Profile + User
   ====================================================== */
router.post(
  "/picture",
  requireAuth,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });

      const relPath = path.join("uploads", "avatars", req.file.filename);
      const fileUrl = publicFileUrl(req, relPath);

      // Update Profile
      const profile = await Profile.findOneAndUpdate(
        { user: req.userId },
        { $set: { avatarUrl: fileUrl } },
        { new: true, upsert: true }
      );

      // Sync User avatar for header display
      await User.findByIdAndUpdate(req.userId, { avatarUrl: fileUrl });

      return res.json({ profile });
    } catch (err) {
      console.error("POST /profile/picture error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
