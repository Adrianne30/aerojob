// --------------------------- AEROJOB FINAL SERVER.JS ----------------------------
// Full backend with Auth, Surveys, Jobs, Companies, Users,
// Admin stats, Profile routes, Logo upload, Analytics,
// Proxy, and Multi-Source Job Scraper (Indeed + Jooble + LinkedIn)
// -------------------------------------------------------------------------------

require("dotenv").config();
if (typeof File === "undefined") global.File = class File {};

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const listEndpoints = require("express-list-endpoints");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const multer = require("multer");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const profileRoutes = require("./routes/profile");

// ---------------------------------------------------------------------------------
// APP INIT
// ---------------------------------------------------------------------------------

const app = express();
app.set("trust proxy", 1);

// ---------------------------------------------------------------------------------
// SECURITY + LOGGER
// ---------------------------------------------------------------------------------

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan("dev"));

// ---------------------------------------------------------------------------------
// CORS CONFIGURATION
// ---------------------------------------------------------------------------------

const ALLOWED_ORIGINS = [
  "https://aerojob.space",
  "https://www.aerojob.space",
  "https://api.aerojob.space",
  "http://localhost:3000",
  "http://localhost:5173",
];

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ---------------------------------------------------------------------------------
// CSP HEADER
// ---------------------------------------------------------------------------------

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; connect-src 'self' https://aerojob.space https://api.aerojob.space https://aerojob-backend-production.up.railway.app https://mycareers.ph https://ph.indeed.com https://www.linkedin.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline';"
  );
  next();
});

// ---------------------------------------------------------------------------------
// BODY & COOKIE
// ---------------------------------------------------------------------------------

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---------------------------------------------------------------------------------
// STATIC UPLOADS (company logos)
// ---------------------------------------------------------------------------------

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------------------------------------------------------------------------------
// RATE LIMITER
// ---------------------------------------------------------------------------------

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ---------------------------------------------------------------------------------
// DATABASE
// ---------------------------------------------------------------------------------

mongoose
  .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
  .then(() => console.log("✅ [DB] Connected"))
  .catch((err) => {
    console.error("[DB ERROR]", err.message);
    process.exit(1);
  });

// ---------------------------------------------------------------------------------
// MODELS
// ---------------------------------------------------------------------------------

const Job = require("./models/Job");
const Company = require("./models/Company");
const Survey = require("./models/Survey");
const User = require("./models/User");
const SurveyResponse = require("./models/SurveyResponse");
const SearchLog = require("./models/SearchLog");

// ---------------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------------

const asyncH =
  (fn) =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// ---------------------------------------------------------------------------------
// JWT HELPERS
// ---------------------------------------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

function getToken(req) {
  const h = req.headers.authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7);
  return req.cookies?.token || null;
}

function requireAuth(req, res, next) {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    req.userRole = payload.role;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.userRole !== "admin")
      return res.status(403).json({ error: "Admin only" });
    next();
  });
}

// ---------------------------------------------------------------------------------
// AUTH + PROFILE ROUTES
// ---------------------------------------------------------------------------------

app.use("/api/auth", require("./routes/auth"));
app.use("/api/profile", profileRoutes);

// ---------------------------------------------------------------------------------
// GET LOGGED-IN USER
// ---------------------------------------------------------------------------------

app.get(
  "/api/auth/me",
  requireAuth,
  asyncH(async (req, res) => {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  })
);

// ---------------------------------------------------------------------------------
// FILE UPLOAD – COMPANY LOGO
// ---------------------------------------------------------------------------------

const UPLOAD_ROOT = path.join(__dirname, "uploads", "companies");
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_ROOT),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, "_");
    cb(null, Date.now() + "-" + safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(png|jpeg|jpg|gif|webp|svg\+xml)$/.test(file.mimetype)) {
      return cb(new Error("Only image files allowed"));
    }
    cb(null, true);
  },
});

app.post("/upload/logo", (req, res) => {
  upload.single("logo")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const url = `/uploads/companies/${req.file.filename}`;
    res.json({ url });
  });
});

// ---------------------------------------------------------------------------------
// API ROUTER
// ---------------------------------------------------------------------------------

const api = express.Router();

// ---------------------------------------------------------------------------------
// HEALTH CHECK
// ---------------------------------------------------------------------------------

api.get("/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ---------------------------------------------------------------------------------
// SURVEY API (FULL)
// ---------------------------------------------------------------------------------

// GET ALL SURVEYS
api.get(
  "/surveys",
  asyncH(async (_req, res) => {
    const surveys = await Survey.find().sort({ createdAt: -1 });
    res.json(surveys);
  })
);

// GET ONE SURVEY
api.get(
  "/surveys/:id",
  asyncH(async (req, res) => {
    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ error: "Survey not found" });
    res.json(survey);
  })
);

// CREATE SURVEY
api.post(
  "/surveys",
  asyncH(async (req, res) => {
    const survey = await Survey.create(req.body);
    res.status(201).json(survey);
  })
);

// UPDATE SURVEY
api.put(
  "/surveys/:id",
  asyncH(async (req, res) => {
    const survey = await Survey.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!survey) return res.status(404).json({ error: "Survey not found" });
    res.json(survey);
  })
);

// DELETE SURVEY
api.delete(
  "/surveys/:id",
  asyncH(async (req, res) => {
    const deleted = await Survey.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ error: "Survey not found" });

    await SurveyResponse.deleteMany({
      $or: [{ survey: deleted._id }, { surveyId: deleted._id }],
    });

    res.json({ deleted: true });
  })
);

// GET ELIGIBLE ACTIVE SURVEYS
api.get(
  "/surveys/active/eligible",
  requireAuth,
  asyncH(async (req, res) => {
    const role = (req.userRole || "").toLowerCase();
    const audienceOr = [{ audience: "all" }];

    if (role === "student")
      audienceOr.push({ audience: "students" }, { audience: "student" });

    if (role === "alumni")
      audienceOr.push(
        { audience: "alumni" },
        { audience: "alumnus" },
        { audience: "alumnae" },
        { audience: "alumna" }
      );

    const active = await Survey.find({
      status: /^active$/i,
      $or: audienceOr,
    }).sort({ createdAt: -1 });

    const responses = await SurveyResponse.find({
      $or: [{ user: req.userId }, { userId: req.userId }],
    }).distinct("survey");

    const eligible = active.filter((s) => !responses.includes(String(s._id)));
    res.json(eligible);
  })
);

// SUBMIT SURVEY RESPONSE
api.post(
  "/surveys/:id/responses",
  requireAuth,
  asyncH(async (req, res) => {
    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ error: "Survey not found" });

    let answers = Array.isArray(req.body.answers) ? req.body.answers : [];

    answers = answers
      .map((a, idx) => {
        if (typeof a === "object" && (a.questionId || a.qid))
          return { questionId: a.questionId || a.qid, value: a.value };

        const qid = survey.questions?.[idx]?._id;
        return qid ? { questionId: qid, value: a } : null;
      })
      .filter(Boolean);

    for (const q of survey.questions) {
      if (!q.required) continue;
      const found = answers.find(
        (a) => String(a.questionId) === String(q._id)
      );
      if (!found || !found.value)
        return res
          .status(400)
          .json({ error: `Question "${q.text}" is required.` });
    }

    const doc = await SurveyResponse.create({
      survey: survey._id,
      surveyId: survey._id,
      answers,
      user: req.userId,
      userId: req.userId,
    });

    res.status(201).json(doc);
  })
);

// GET SURVEY RESPONSES
api.get(
  "/surveys/:id/responses",
  asyncH(async (req, res) => {
    const exists = await Survey.exists({ _id: req.params.id });
    if (!exists) return res.status(404).json({ error: "Survey not found" });

    const responses = await SurveyResponse.find({
      $or: [{ survey: req.params.id }, { surveyId: req.params.id }],
    })
      .populate("user", "firstName lastName email role userType")
      .sort({ createdAt: -1 });

    res.json(responses);
  })
);

// DELETE RESPONSE
api.delete(
  "/survey-responses/:id",
  asyncH(async (req, res) => {
    const deleted = await SurveyResponse.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ error: "Response not found" });

    res.json({ deleted: true });
  })
);

// EXPORT RESPONSES TO CSV
api.get(
  "/surveys/:id/responses/export",
  asyncH(async (req, res) => {
    const id = req.params.id;

    const rows = await SurveyResponse.find({
      $or: [{ survey: id }, { surveyId: id }],
    })
      .populate("user", "firstName lastName email role userType")
      .lean();

    const headers = [
      "_id",
      "createdAt",
      "userEmail",
      "userName",
      "role",
      "answers",
    ];
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r._id,
          r.createdAt?.toISOString?.() || "",
          r.user?.email || "",
          [r.user?.firstName, r.user?.lastName].filter(Boolean).join(" "),
          r.user?.role || "",
          JSON.stringify(r.answers || []),
        ]
          .map(escape)
          .join(",")
      ),
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="responses.csv"'
    );
    res.send(lines.join("\n"));
  })
);

// ---------------------------------------------------------------------------------
// PUBLIC PROXY — allows frontend to fetch blocked external pages
// ---------------------------------------------------------------------------------

app.get("/proxy", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "No URL provided" });

    const API_KEY = process.env.SCRAPERAPI_KEY;
    if (!API_KEY)
      return res.status(500).json({ error: "Missing SCRAPERAPI_KEY" });

    const scraperUrl =
      `https://api.scraperapi.com?api_key=${API_KEY}&render=true&url=` +
      encodeURIComponent(url);

    const response = await fetch(scraperUrl);
    const html = await response.text();

    res.send(html);
  } catch (err) {
    console.error("Proxy ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------------
// SCRAPER API ROUTE — fetches aviation jobs (multi-source ready)
// ---------------------------------------------------------------------------------

const scrapeAviationJobs = require("./scraper/scraper");

api.get(
  "/jobs/scrape",
  asyncH(async (req, res) => {
    try {
      const scraped = await scrapeAviationJobs();

      let created = 0;

      for (const j of scraped) {
        const exists = await Job.findOne({
          title: j.title,
          companyName: j.company,
        });

        if (!exists) {
          await Job.create({
            title: j.title,
            companyName: j.company,
            description: "Scraped aviation job posting.",
            location: j.location,
            link: j.link,
            status: "active",
            isApproved: true,
          });
          created++;
        }
      }

      res.json({
        ok: true,
        found: scraped.length,
        saved: created,
        preview: scraped.slice(0, 10),
      });
    } catch (err) {
      console.error("SCRAPER ROUTE ERROR:", err.message);
      res.status(500).json({ ok: false, error: "Backend scrape failed" });
    }
  })
);

// ---------------------------------------------------------------------------------
// STANDARD JOB ROUTES (CRUD)
// ---------------------------------------------------------------------------------

// GET ALL JOBS
api.get(
  "/jobs",
  asyncH(async (req, res) => {
    const q = {};

    if (req.query.q) q.$text = { $search: req.query.q };
    if (req.query.jobType) q.jobType = req.query.jobType;
    if (req.query.location)
      q.location = new RegExp(`^${req.query.location}$`, "i");
    if (req.query.category) q.categories = req.query.category;
    if (req.query.approvedOnly === "true") q.isApproved = true;
    if (req.query.status) q.status = req.query.status;

    const jobs = await Job.find(q)
      .populate("company", "name logoUrl location website industry email phone")
      .sort({ createdAt: -1 });

    res.json(jobs);
  })
);

// GET JOB CATEGORY LIST
api.get(
  "/jobs/categories",
  asyncH(async (_req, res) => {
    const list = await Job.distinct("categories", {
      categories: { $ne: null },
    });
    res.json(list.filter(Boolean).sort());
  })
);

// GET SINGLE JOB
api.get(
  "/jobs/:id",
  asyncH(async (req, res) => {
    const job = await Job.findById(req.params.id).populate(
      "company",
      "name logoUrl location website industry email phone"
    );
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  })
);

// CREATE JOB
api.post(
  "/jobs",
  asyncH(async (req, res) => {
    if (req.body.company) {
      const exists = await Company.exists({ _id: req.body.company });
      if (!exists)
        return res.status(400).json({ error: "Invalid company ID" });
    }

    const job = await Job.create({
      ...req.body,
      status: req.body.status || "active",
      isApproved: true,
    });

    await job.populate(
      "company",
      "name logoUrl location website industry email phone"
    );

    res.status(201).json(job);
  })
);

// UPDATE JOB
api.put(
  "/jobs/:id",
  asyncH(async (req, res) => {
    if (req.body.company) {
      const exists = await Company.exists({ _id: req.body.company });
      if (!exists)
        return res.status(400).json({ error: "Invalid company ID" });
    }

    const job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate(
      "company",
      "name logoUrl location website industry email phone"
    );

    if (!job) return res.status(404).json({ error: "Job not found" });

    res.json(job);
  })
);

// DELETE JOB
api.delete(
  "/jobs/:id",
  asyncH(async (req, res) => {
    const deleted = await Job.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Job not found" });
    res.json({ deleted: true });
  })
);


// ---------------------------------------------------------------------------------
// COMPANY HELPERS
// ---------------------------------------------------------------------------------

const isValidEmail = (v) =>
  typeof v === "string" ? /.+\@.+\..+/.test(v) : false;

const pickCompanyFields = (src = {}) => {
  const out = {};
  if (src.name != null) out.name = String(src.name).trim();
  if (src.industry != null) out.industry = String(src.industry).trim();
  if (src.location != null) out.location = String(src.location).trim();
  if (src.description != null) out.description = String(src.description).trim();
  if (src.website != null) out.website = String(src.website).trim();
  if (src.email != null) out.email = String(src.email).trim().toLowerCase();
  if (src.phone != null) out.phone = String(src.phone).trim();
  if (src.logoUrl != null) out.logoUrl = String(src.logoUrl).trim();
  if (typeof src.isActive === "boolean") out.isActive = src.isActive;
  return out;
};

// ---------------------------------------------------------------------------------
// COMPANY ROUTES
// ---------------------------------------------------------------------------------

api.get(
  "/companies",
  asyncH(async (_req, res) => {
    const companies = await Company.find().sort({ createdAt: -1 });
    res.json({ companies });
  })
);

api.get(
  "/companies/:id",
  asyncH(async (req, res) => {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ error: "Company not found" });
    res.json({ company });
  })
);

api.post(
  "/companies",
  asyncH(async (req, res) => {
    const body = pickCompanyFields(req.body);

    if (!body.name)
      return res.status(400).json({ message: "Company name is required" });

    const dup = await Company.findOne({ name: body.name });
    if (dup)
      return res.status(409).json({ message: "Company already exists" });

    if (body.email && !isValidEmail(body.email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const company = await Company.create({
      ...body,
      isActive:
        typeof body.isActive === "boolean" ? body.isActive : true,
    });

    res.status(201).json({ company });
  })
);

api.put(
  "/companies/:id",
  asyncH(async (req, res) => {
    const update = pickCompanyFields(req.body);

    if (update.name) {
      const clash = await Company.findOne({
        name: update.name,
        _id: { $ne: req.params.id },
      });
      if (clash)
        return res.status(409).json({
          message: "Company name already in use",
        });
    }

    if (update.email && !isValidEmail(update.email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    if (!company) return res.status(404).json({ error: "Company not found" });
    res.json({ company });
  })
);

api.delete(
  "/companies/:id",
  asyncH(async (req, res) => {
    const deleted = await Company.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Company not found" });
    res.json({ message: "Company deleted" });
  })
);

// ---------------------------------------------------------------------------------
// PUBLIC USERS CRUD
// ---------------------------------------------------------------------------------

api.get(
  "/users",
  asyncH(async (req, res) => {
    const { role, status, course } = req.query;
    const q = {};
    if (role) q.role = role;
    if (status) q.status = status;
    if (course) q.course = course;

    const users = await User.find(q).sort({ createdAt: -1 });
    res.json(users);
  })
);

api.get(
  "/users/:id",
  asyncH(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  })
);

api.post(
  "/users",
  asyncH(async (req, res) => {
    const user = await User.create(req.body);
    res.status(201).json(user);
  })
);

api.put(
  "/users/:id",
  asyncH(async (req, res) => {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  })
);

api.delete(
  "/users/:id",
  asyncH(async (req, res) => {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "User not found" });
    res.json({ deleted: true });
  })
);

// ---------------------------------------------------------------------------------
// ADMIN USER ROUTES
// ---------------------------------------------------------------------------------

api.get(
  "/admin/users",
  requireAdmin,
  asyncH(async (_req, res) => {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  })
);

api.get(
  "/admin/users/:id",
  requireAdmin,
  asyncH(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  })
);

api.post(
  "/admin/users",
  requireAdmin,
  asyncH(async (req, res) => {
    const {
      role,
      userType,
      firstName,
      lastName,
      email,
      password,
      studentId,
      course,
      yearLevel,
      phone,
      status,
    } = req.body || {};

    if (!email || !password)
      return res
        .status(400)
        .json({ error: "Email and password are required" });

    const exists = await User.findOne({
      email: String(email).toLowerCase().trim(),
    });

    if (exists)
      return res.status(409).json({ error: "Email already exists" });

    const hash = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      role: (role || userType || "student").toLowerCase(),
      firstName,
      lastName,
      email: String(email).toLowerCase().trim(),
      password: hash,
      studentId,
      course,
      yearLevel,
      phone,
      status: status || "active",
    });

    res.status(201).json(user);
  })
);

api.put(
  "/admin/users/:id",
  requireAdmin,
  asyncH(async (req, res) => {
    const update = { ...req.body };

    if (update.password) {
      update.password = await bcrypt.hash(String(update.password), 10);
    }

    if (update.email) {
      update.email = String(update.email).toLowerCase().trim();
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  })
);

api.delete(
  "/admin/users/:id",
  requireAdmin,
  asyncH(async (req, res) => {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "User not found" });
    res.json({ deleted: true });
  })
);

// ---------------------------------------------------------------------------------
// STUDENT STATS
// ---------------------------------------------------------------------------------

api.get(
  "/student/stats",
  requireAuth,
  asyncH(async (req, res) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const availableJobs = await Job.countDocuments({ status: "active" });

      const viewed = await SearchLog.countDocuments({
        user: req.userId,
        role: /student/i,
      });

      const companies = await Company.countDocuments();

      res.json({
        success: true,
        availableJobs,
        jobsViewed: viewed,
        companies,
      });
    } catch (err) {
      console.error("Student stats error:", err);
      res.status(500).json({ success: false, error: "Server error" });
    }
  })
);

// ---------------------------------------------------------------------------------
// ADMIN STATS
// ---------------------------------------------------------------------------------

api.get(
  "/admin/stats",
  requireAdmin,
  asyncH(async (_req, res) => {
    try {
      const availableJobs = await Job.countDocuments({ status: "active" });
      const companies = await Company.countDocuments();
      const users = await User.countDocuments();
      const totalSearches = await SearchLog.countDocuments();

      res.json({
        success: true,
        availableJobs,
        companies,
        users,
        totalSearches,
      });
    } catch (err) {
      console.error("Admin stats error:", err);
      res.status(500).json({ success: false, error: "Server error" });
    }
  })
);

// ---------------------------------------------------------------------------------
// SEARCH ANALYTICS LOGGING
// ---------------------------------------------------------------------------------

api.post(
  "/analytics/search",
  asyncH(async (req, res) => {
    const raw = String(req.body?.term || "").trim();
    if (!raw) return res.status(400).json({ ok: false, error: "term required" });

    let userId = null;
    let role = "guest";

    const tok = getTokenFromReq(req);
    if (tok) {
      try {
        const payload = jwt.verify(tok, JWT_SECRET);
        userId = payload.sub || null;
        role = (payload.role || "guest").toLowerCase();
      } catch (_) {}
    } else if (req.body?.role) {
      role = String(req.body.role).toLowerCase();
    }

    const term = raw.toLowerCase();

    try {
      await SearchLog.create({ term, user: userId, role });
    } catch (_) {}

    res.json({ ok: true });
  })
);

// ---------------------------------------------------------------------------------
// MOUNT API ROUTES
// ---------------------------------------------------------------------------------

app.use("/api", api);

// ---------------------------------------------------------------------------------
// SERVE FRONTEND BUILD
// ---------------------------------------------------------------------------------

const frontendPath = path.join(__dirname, "../frontend/build");

app.use(express.static(frontendPath));

app.get("*", (req, res) => {
  if (req.originalUrl.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found" });
  }

  res.sendFile(path.join(frontendPath, "index.html"));
});

// ---------------------------------------------------------------------------------
// ERROR HANDLER
// ---------------------------------------------------------------------------------

app.use((err, _req, res, _next) => {
  console.error("[API ERROR]", err);
  res.status(err.status || 500).json({
    error: err.message || "Server error",
  });
});

// ---------------------------------------------------------------------------------
// START SERVER
// ---------------------------------------------------------------------------------

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);

  try {
    const table = listEndpoints(app).map((e) => ({
      method: e.methods.join(","),
      path: e.path,
    }));
    console.table(table);
  } catch (err) {
    console.warn("Could not print endpoints:", err.message);
  }
});

module.exports = scrapeAviationJobs;
