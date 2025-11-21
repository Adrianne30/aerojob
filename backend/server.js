// AEROJOB API server with Auth, Surveys, Jobs, Companies, Users, Admin stats, Profile, and Analytics endpoints
require('dotenv').config();
if (typeof File === 'undefined') global.File = class File {};

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const listEndpoints = require('express-list-endpoints');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const multer = require('multer');
const profileRoutes = require('./routes/profile');
const { sendMail } = require('./utils/mailer');
const app = express();
app.set('trust proxy', 1);
const axios = require("axios");
const cheerio = require("cheerio");
const https = require('https');
const dns = require('dns');

/* ----------------------------- Security & Logging ----------------------------- */
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('dev'));

/* ----------------------------- CORS (put FIRST) ------------------------------ */
const ALLOWED_ORIGINS = [
  'https://aerojob.space',
  'https://www.aerojob.space',
  'https://api.aerojob.space',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

/* ----------------------------- CSP HEADER FIX ------------------------------ */
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; connect-src 'self' https://aerojob.space https://api.aerojob.space https://aerojob-backend-production.up.railway.app; img-src 'self' data: blob: https://aerojob.space https://api.aerojob.space; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline';"
  );
  next();
});

/* ------------------------------- Body Parsers -------------------------------- */
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ------------------------------ Static Uploads ------------------------------- */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ------------------------------- Rate Limiting ------------------------------- */
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 400,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
  })
);

/* --------------------------------- Database --------------------------------- */
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aerojob';
let seedAdmin = null;
try {
  seedAdmin = require('./scripts/seedAdmin');
} catch (_) {}

mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
  .then(async () => {
    console.log('[DB] Connected');
    if (typeof seedAdmin === 'function') {
      try {
        await seedAdmin();
        console.log('[Seed] Admin ensured');
      } catch (e) {
        console.warn('[Seed] Skipped/failed:', e.message);
      }
    }
  })
  .catch((err) => {
    console.error('[DB] Connection error:', err.message);
    process.exit(1);
  });

/* ---------------------------------- Models ---------------------------------- */
const Job = require('./models/Job');
const Company = require('./models/Company');
const Survey = require('./models/Survey');
const User = require('./models/User');
const SurveyResponse = require('./models/SurveyResponse');
const SearchLog = require('./models/SearchLog');

/* ------------------------------- Helpers/Utils ------------------------------- */
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role || user.userType || 'user' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );
}

function getTokenFromReq(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  if (req.cookies?.token) return req.cookies.token;
  return null;
}

function requireAuth(req, res, next) {
  try {
    const token = getTokenFromReq(req);
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    req.userRole = (payload.role || '').toLowerCase();
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return;
    if ((req.userRole || '').toLowerCase() !== 'admin')
      return res.status(403).json({ error: 'Admin only' });
    next();
  });
}

/* ------------------------------ Mount /api/auth & /api/profile ------------------- */
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', profileRoutes);

app.get('/api/auth/me', requireAuth, asyncH(async (req, res) => {
  const user = await User.findById(req.userId).select('-password');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}));

/* --------------------------- File Upload: Company Logo ----------------------- */
const UPLOAD_ROOT = path.join(__dirname, 'uploads');
const COMPANY_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'companies');
fs.mkdirSync(COMPANY_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, COMPANY_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});
function imageFileFilter(_req, file, cb) {
  if (!/^image\/(png|jpeg|jpg|gif|webp|svg\+xml)$/.test(file.mimetype)) {
    return cb(new Error('Only image files are allowed (png, jpg, jpeg, gif, webp, svg)'));
  }
  cb(null, true);
}
const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.post('/upload/logo', (req, res) => {
  upload.single('logo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `/uploads/companies/${req.file.filename}`;
    return res.json({ url });
  });
});

/* ---------------------------------- /api ------------------------------------ */
const api = express.Router();

/* Health */
api.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

/* ------------------------------- SURVEYS ------------------------------------ */
api.get(
  '/surveys',
  asyncH(async (_req, res) => {
    const surveys = await Survey.find().sort({ createdAt: -1 });
    res.json(surveys);
  })
);

api.get(
  '/surveys/:id',
  asyncH(async (req, res) => {
    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    res.json(survey);
  })
);

api.post(
  '/surveys',
  asyncH(async (req, res) => {
    const survey = await Survey.create(req.body);
    res.status(201).json(survey);
  })
);

api.put(
  '/surveys/:id',
  asyncH(async (req, res) => {
    const survey = await Survey.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    res.json(survey);
  })
);

api.delete(
  '/surveys/:id',
  asyncH(async (req, res) => {
    const deleted = await Survey.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Survey not found' });
    await SurveyResponse.deleteMany({ $or: [{ survey: deleted._id }, { surveyId: deleted._id }] });
    res.json({ deleted: true });
  })
);

api.get(
  '/surveys/active/eligible',
  requireAuth,
  asyncH(async (req, res) => {
    const role = (req.userRole || '').toLowerCase();

    const audienceOr = [{ audience: 'all' }];
    if (role === 'student') audienceOr.push({ audience: 'students' }, { audience: 'student' });
    if (role === 'alumni')
      audienceOr.push({ audience: 'alumni' }, { audience: 'alumnus' }, { audience: 'alumnae' }, { audience: 'alumna' });

    const activeList = await Survey.find({
      status: { $regex: /^active$/i },
      $or: audienceOr,
    }).sort({ createdAt: -1 });

    if (!req.userId) return res.json(activeList);

    const answeredA = await SurveyResponse.find({
      $or: [{ user: req.userId }, { userId: req.userId }],
    }).distinct('survey');

    const answeredB = await SurveyResponse.find({
      $or: [{ user: req.userId }, { userId: req.userId }],
    }).distinct('surveyId');

    const answered = new Set([...answeredA.map(String), ...answeredB.map(String)]);
    const eligible = activeList.filter((s) => !answered.has(String(s._id)));

    res.json(eligible);
  })
);

api.post(
  '/surveys/:id/responses',
  requireAuth,
  asyncH(async (req, res) => {
    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Survey not found' });

    let answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    answers = answers
      .map((a, idx) => {
        if (a && typeof a === 'object' && ('questionId' in a || 'qid' in a)) {
          return { questionId: a.questionId || a.qid, value: a.value };
        }
        const qid = survey.questions?.[idx]?._id;
        return qid ? { questionId: qid, value: a } : null;
      })
      .filter(Boolean);

    for (const q of survey.questions || []) {
      if (!q.required) continue;
      const found = answers.find((a) => String(a.questionId) === String(q._id));
      const empty =
        found == null ||
        found.value == null ||
        (Array.isArray(found.value) ? found.value.length === 0 : String(found.value).trim() === '');
      if (empty) {
        return res.status(400).json({ error: `Question "${q.text}" is required.` });
      }
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

api.get(
  '/surveys/:id/responses',
  asyncH(async (req, res) => {
    const surveyExists = await Survey.exists({ _id: req.params.id });
    if (!surveyExists) return res.status(404).json({ error: 'Survey not found' });

    const responses = await SurveyResponse.find({
      $or: [{ survey: req.params.id }, { surveyId: req.params.id }],
    })
      .populate('user', 'firstName lastName email role userType')
      .sort({ createdAt: -1 });

    res.json(responses);
  })
);

api.delete(
  '/survey-responses/:id',
  asyncH(async (req, res) => {
    const deleted = await SurveyResponse.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Response not found' });
    res.json({ deleted: true });
  })
);

api.get(
  '/surveys/:id/responses/export',
  asyncH(async (req, res) => {
    const id = req.params.id;
    const rows = await SurveyResponse.find({
      $or: [{ survey: id }, { surveyId: id }],
    })
      .populate('user', 'firstName lastName email role userType')
      .lean();

    const headers = ['_id', 'createdAt', 'userEmail', 'userName', 'role', 'answers'];
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r._id,
          r.createdAt?.toISOString?.() || '',
          r.user?.email || '',
          [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ') || '',
          r.user?.role || r.user?.userType || '',
          JSON.stringify(r.answers ?? []),
        ].map(escape).join(',')
      ),
    ];
    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="responses.csv"');
    res.send(csv);
  })
);

/* ----------------------------- JOB SCRAPING (MYCAREERSPH) ---------------------------- */
async function scrapeAviationJobs(opts = {}) {
  const API_KEY = process.env.SCRAPERAPI_KEY;
  const q = String(opts.q || 'aviation').trim();
  const targetURL =
    opts.url ||
    (opts.site === 'mycareers' ? `https://mycareers.ph/job-search?query=${encodeURIComponent(q)}` :
     opts.site === 'indeed' ? `https://ph.indeed.com/jobs?q=${encodeURIComponent(q)}` :
     `https://mycareers.ph/job-search?query=${encodeURIComponent(q)}`);

const primaryIsScraper = (!!API_KEY && !process.env.SCRAPER_PROXY_URL);

let scraperURL = targetURL;

if (primaryIsScraper) {
  scraperURL = `https://api.scraperapi.com?api_key=${API_KEY}&render=true&url=${encodeURIComponent(targetURL)}`;
}

// If SCRAPER_PROXY_URL exists, override everything
if (process.env.SCRAPER_PROXY_URL) {
  const proxy = process.env.SCRAPER_PROXY_URL;
  if (proxy.includes("{url}")) {
    scraperURL = proxy.replace("{url}", encodeURIComponent(targetURL));
  } else {
    const sep = proxy.includes("?") ? "&" : "?";
    scraperURL = `${proxy}${sep}url=${encodeURIComponent(targetURL)}`;
  }
  console.log("[SCRAPER] Using proxy:", scraperURL);
}


  console.log("[SCRAPER] Fetching jobs from", targetURL, primaryIsScraper ? "(via ScraperAPI)" : "(direct fetch)");

  const attempts = [];

  // If HTML provided in opts (base64 or raw), use it directly and skip fetching.
  if (opts.html) {
    let providedHtml = String(opts.html || '');
    try {
      // try base64 decode first (client can send base64 to avoid URL-length issues)
      const decoded = Buffer.from(providedHtml, 'base64').toString('utf8');
      // if decoding produced non-empty and looks like HTML, use it
      if (decoded && /<\s*html|<\s*div|<\s*body|<\/\w+>/.test(decoded)) {
        providedHtml = decoded;
      }
    } catch (_) {
      // ignore decode error, use raw
    }
    attempts.push({ url: '(provided-html)', note: 'skipped-fetch, parsing provided HTML', length: providedHtml.length, at: new Date().toISOString() });
    // set html variable so parser below continues unchanged
    var html = providedHtml;
  }

  // helper: sleep/backoff
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // --- Network agent / proxy setup ---
  // Support HTTPS_PROXY / HTTP_PROXY env (preferred) and optional FORCE_IPV4 to force IPv4 lookup.
  let proxyAgent = null;
  const proxyFromEnv = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || null;
  if (proxyFromEnv) {
    try {
      const { HttpsProxyAgent } = require('https-proxy-agent');
      proxyAgent = new HttpsProxyAgent(proxyFromEnv);
      console.log('[SCRAPER] Using proxy from env:', proxyFromEnv);
    } catch (e) {
      console.warn('[SCRAPER] https-proxy-agent not available, proxy disabled:', e.message);
      proxyAgent = null;
    }
  }

  // Optional IPv4-only agent to avoid IPv6/DNS/TLS issues on some hosts (enable with FORCE_IPV4=true)
  let ipv4Agent = null;
  if (String(process.env.FORCE_IPV4 || '').toLowerCase() === 'true') {
    try {
      ipv4Agent = new https.Agent({
        keepAlive: true,
        lookup: (hostname, options, callback) => dns.lookup(hostname, { family: 4 }, callback),
      });
      console.log('[SCRAPER] IPv4 agent enabled (FORCE_IPV4=true)');
    } catch (e) {
      console.warn('[SCRAPER] Failed to create IPv4 agent:', e.message);
      ipv4Agent = null;
    }
  }

  const SCRAPER_TIMEOUT = parseInt(process.env.SCRAPER_TIMEOUT || '45000', 10);
  const MAX_CONTENT = 8 * 1024 * 1024; // 8MB

  // exponential backoff with jitter
  function backoff(attempt) {
    const base = 500 * Math.pow(2, attempt - 1);
    const jitter = Math.floor(Math.random() * 300);
    return base + jitter;
  }

  async function tryFetchWithRetries(url, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const now = new Date().toISOString();
      try {
        const axiosOpts = {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)",
            "Accept-Language": "en-US,en;q=0.9",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          timeout: SCRAPER_TIMEOUT,
          responseType: 'text',
          maxContentLength: MAX_CONTENT,
          maxRedirects: 5,
        };

        // choose appropriate agent: IPv4 agent preferred, else proxy agent, else default
        if (ipv4Agent) {
          axiosOpts.httpsAgent = ipv4Agent;
          axiosOpts.proxy = false;
          console.log(`[SCRAPER] Attempt ${attempt} -> ${url} (using IPv4 agent)`);
        } else if (proxyAgent) {
          axiosOpts.httpsAgent = proxyAgent;
          axiosOpts.proxy = false;
          console.log(`[SCRAPER] Attempt ${attempt} -> ${url} (using proxy)`);
        } else {
          console.log(`[SCRAPER] Attempt ${attempt} -> ${url} (default agent)`);
        }

        const resp = await axios.get(url, axiosOpts);
        attempts.push({ url, status: resp.status, length: String(resp.data || '').length, attempt, at: now });
        return resp.data;
      } catch (err) {
        const info = {
          url,
          attempt,
          at: now,
          error: err.message || String(err),
          status: err.response?.status,
          snippet: err.response?.data ? String(err.response?.data).slice(0, 200) : undefined,
        };
        attempts.push(info);
        if (attempt < maxAttempts) await sleep(backoff(attempt));
      }
    }
    return null;
  }

  // Only fetch if html wasn't provided above
  if (typeof html === 'undefined') {
    let fetched = await tryFetchWithRetries(scraperURL, 2);
    if (!fetched && primaryIsScraper) {
      console.warn("[SCRAPER] ScraperAPI attempt failed, falling back to direct fetch");
      fetched = await tryFetchWithRetries(targetURL, 3);
    } else if (!fetched) {
      fetched = await tryFetchWithRetries(targetURL, 3);
    }

    if (!fetched) {
      console.error("[SCRAPER] All fetch attempts failed:", attempts);
      return {
        jobs: [], attempts,
        note: 'If Railway blocks outbound TLS you can provide page HTML via the html query/body (base64) or set SCRAPER_PROXY_URL to route through a proxy.'
      };
    }
    html = fetched;
  }

  const $ = cheerio.load(html);
  const jobs = [];
  const seen = new Set();
  const aviationKeywords = ['aviation','aerospace','pilot','airline','flight','aeronautic','aircraft','avionics','air safety','air traffic'];

  function looksAviation(text = '') {
    const s = (text || '').toLowerCase();
    return aviationKeywords.some(k => s.includes(k));
  }

  // 1) Try to parse JSON-LD JobPosting(s)
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const data = JSON.parse($(el).contents().text() || '{}');
      const arr = Array.isArray(data) ? data : [data];
      for (const item of arr) {
        if (!item) continue;
        if (item['@type'] === 'JobPosting' || (item['@type'] && String(item['@type']).toLowerCase().includes('job'))) {
          const title = item.title || item.name || '';
          const company = (item.hiringOrganization && (item.hiringOrganization.name || item.hiringOrganization)) || item.company || '';
          const location = item.jobLocation?.address?.addressLocality || item.jobLocation || item.address || '';
          const link = item.url || item.href || targetURL;
          const key = `${title}|${company}|${link}`;
          if (title && (looksAviation(title) || looksAviation(company) || looksAviation(item.description))) {
            if (!seen.has(key)) {
              seen.add(key);
              jobs.push({ title: title.trim(), company: String(company).trim(), location: String(location).trim(), link });
            }
          }
        }
      }
    } catch (_) {}
  });

  // 2) Heuristic DOM parsing: common job-card selectors + generic anchors/articles/list items
  const candidateSelectors = [
    '.job-card', '.job-item', '.career-job', '.listing-item', '.result-item', '.job', '.posting', '.job-listing',
    'article', 'li', '.job-row', '.job-teaser', '.result',
  ];

  const anchors = $('a[href]').toArray();
  const candidates = new Set();

  // Add nodes matching selectors
  candidateSelectors.forEach(sel => {
    $(sel).each((_, el) => candidates.add(el));
  });

  // Add anchors that look like job links
  anchors.forEach(a => {
    const href = $(a).attr('href') || '';
    const text = ($(a).text() || '').trim();
    if (href && (href.toLowerCase().includes('/job') || href.toLowerCase().includes('job') || text.length < 200)) {
      candidates.add(a);
    }
  });

  // Process candidates
  for (const el of Array.from(candidates)) {
    const $el = $(el);
    // try to find an anchor within or closest anchor
    let anchor = $el.is('a') ? $el : $el.find('a[href]').first();
    if (!anchor || !anchor.length) anchor = $el.closest('a').first();

    // Title heuristics
    let title =
      ($el.find('.job-title, .title, h2, h3, .posting-title, .jobname').first().text() || '').trim() ||
      (anchor && ($(anchor).find('h2, h3, .title').first().text() || $(anchor).text())) ||
      ($el.attr('title') || '');

    // Company heuristics
    let company =
      ($el.find('.company-name, .company, .job-company, .company__name, .employer').first().text() || '').trim() ||
      ($el.find('.company').text() || '').trim();

    // Location heuristics
    let location =
      ($el.find('.job-location, .location, .job-meta, .location__name, .job-location__name, .place').first().text() || '').trim();

    // link
    let href = anchor && $(anchor).attr('href') || '';
    if (href && !href.startsWith('http')) {
      if (!href.startsWith('/')) href = '/' + href;
      const base = new URL(targetURL).origin;
      href = base + href;
    }
    // fallback link: try data-href or onclick
    if (!href) {
      href = $el.attr('data-href') || $el.attr('data-url') || '';
      if (href && !href.startsWith('http')) {
        const base = new URL(targetURL).origin;
        if (!href.startsWith('/')) href = '/' + href;
        href = base + href;
      }
    }

    title = (title || '').replace(/\s+/g, ' ').trim();
    company = (company || '').replace(/\s+/g, ' ').trim();

    // Try to extract text blob and check for aviation terms
    const blob = [title, company, location, $el.text()].filter(Boolean).join(' ').slice(0, 800);
    if (!title && anchor) {
      title = ($(anchor).text() || '').trim();
    }
    if (!title && blob.length > 0) {
      const m = blob.match(/^[^\n]{3,120}/);
      title = title || (m ? m[0].trim() : '');
    }

    if (!title && !company) continue;
    // require some aviation relevance
    if (!looksAviation(blotify(blob))) {
      // allow if explicit keyword in title/company
      if (!looksAviation(title) && !looksAviation(company)) continue;
    }

    const key = `${title}|${company}|${href}`;
    if (!seen.has(key)) {
      seen.add(key);
      jobs.push({ title, company, location: location || '', link: href || targetURL });
    }
    // stop early if too many
    if (jobs.length >= (opts.max || 200)) break;
  }

  // Dedupe by normalized title+company+link
  function normalize(s='') { return String(s||'').trim().toLowerCase().replace(/\s+/g,' '); }
  const unique = [];
  const uniqSet = new Set();
  for (const j of jobs) {
    const k = `${normalize(j.title)}|${normalize(j.company)}|${normalize(j.link)}`;
    if (!uniqSet.has(k)) {
      uniqSet.add(k);
      unique.push(j);
    }
  }

  console.log(`[SCRAPER] Found ${unique.length} job(s) — attempts:`, attempts.map(a => ({ url: a.url, status: a.status, error: a.error, attempt: a.attempt, at: a.at })));
  return { jobs: unique, attempts, note: undefined };

  // local helper to avoid using global variable names accidentally
  function blotify(s){ return String(s||'').replace(/\s+/g,' ').trim(); }
}

/* ----------------------------- SCRAPER ROUTE (MUST BE FIRST) ---------------------------- */
api.get(
  '/jobs/scrape',
  asyncH(async (req, res) => {
    try {
      // accept query params: q (search term), url (target full url), site (alias), save=true, max (limit)
      // Also accept `html` (base64 or raw) to parse provided HTML (useful if Railway blocks outbound TLS).
      const opts = {
        q: req.query.q,
        url: req.query.url,
        site: req.query.site,
        max: parseInt(req.query.max || '200', 10),
        html: req.query.html, // optional: base64 or raw HTML
      };
      const result = await scrapeAviationJobs(opts);
      const scraped = Array.isArray(result) ? result : (result.jobs || []);
      const attempts = result.attempts || [];

      // if scraper returned a note (e.g. proxy/html hint) include it
      const note = result.note;

      const saveRequested = String(req.query.save || '').toLowerCase() === 'true';
      const MAX_SAVE = 50;
      let created = 0;
      let skipped = 0;
      const errors = [];

      if (saveRequested && scraped.length > 0) {
        const toSave = scraped.slice(0, MAX_SAVE);
        const ops = toSave.map(async (j) => {
          try {
            const exists =
              (j.link ? await Job.findOne({ link: j.link }) : null) ||
              (j.title ? await Job.findOne({ title: j.title, companyName: j.company }) : null);
            if (!exists) {
              await Job.create({
                title: j.title,
                description: 'External aviation job listing (scraped).',
                companyName: j.company,
                location: j.location,
                link: j.link,
                status: 'active',
                isApproved: true,
              });
              return { status: 'created' };
            } else {
              return { status: 'skipped' };
            }
          } catch (e) {
            return { status: 'error', error: e.message || String(e), job: j };
          }
        });

        const results = await Promise.allSettled(ops);
        for (const r of results) {
          if (r.status === 'fulfilled') {
            const v = r.value;
            if (v.status === 'created') created++;
            else if (v.status === 'skipped') skipped++;
            else if (v.status === 'error') errors.push(v);
          } else {
            errors.push({ status: 'rejected', reason: String(r.reason) });
          }
        }
      }

      const resp = {
        message: 'Scraping complete',
        found: scraped.length,
        preview: scraped.slice(0, 20),
        attempts: attempts,
        created,
        skipped,
        errorsCount: errors.length,
        saveRequested,
        savedLimit: saveRequested ? MAX_SAVE : 0,
        note,
      };

      if (scraped.length === 0 && attempts.length > 0) {
        return res.json({ ok: false, note: 'No jobs scraped; see attempts for details', ...resp });
      }

      return res.json({ ok: true, ...resp });
    } catch (error) {
      console.error('Scrape error (unexpected):', error.message || error);
      return res.status(200).json({ ok: false, error: String(error.message || error) });
    }
  })
);

// Add POST variant so callers can provide HTML directly (raw or base64) to bypass outbound fetch
api.post(
  '/jobs/scrape',
  asyncH(async (req, res) => {
    // Accept same params as GET but prefer body, and accept body.html (raw or base64)
    const opts = {
      q: req.body.q || req.query.q,
      url: req.body.url || req.query.url,
      site: req.body.site || req.query.site,
      max: parseInt(req.body.max || req.query.max || '200', 10),
      html: req.body.html || req.body.htmlBase64 || null,
    };

    const result = await scrapeAviationJobs(opts);
    const scraped = Array.isArray(result) ? result : (result.jobs || []);
    const attempts = result.attempts || [];
    const note = result.note;

    const saveRequested = String(req.body.save || req.query.save || '').toLowerCase() === 'true';
    const MAX_SAVE = 50;
    let created = 0;
    let skipped = 0;
    const errors = [];

    if (saveRequested && scraped.length > 0) {
      const toSave = scraped.slice(0, MAX_SAVE);
      const ops = toSave.map(async (j) => {
        try {
          const exists =
            (j.link ? await Job.findOne({ link: j.link }) : null) ||
            (j.title ? await Job.findOne({ title: j.title, companyName: j.company }) : null);
          if (!exists) {
            await Job.create({
              title: j.title,
              description: 'External aviation job listing (scraped).',
              companyName: j.company,
              location: j.location,
              link: j.link,
              status: 'active',
              isApproved: true,
            });
            return { status: 'created' };
          } else {
            return { status: 'skipped' };
          }
        } catch (e) {
          return { status: 'error', error: e.message || String(e), job: j };
        }
      });

      const results = await Promise.allSettled(ops);
      for (const r of results) {
        if (r.status === 'fulfilled') {
          const v = r.value;
          if (v.status === 'created') created++;
          else if (v.status === 'skipped') skipped++;
          else if (v.status === 'error') errors.push(v);
        } else {
          errors.push({ status: 'rejected', reason: String(r.reason) });
        }
      }
    }

    const resp = {
      message: 'Scraping complete',
      found: scraped.length,
      preview: scraped.slice(0, 20),
      attempts,
      created,
      skipped,
      errorsCount: errors.length,
      saveRequested,
      savedLimit: saveRequested ? MAX_SAVE : 0,
      note,
    };

    if (scraped.length === 0 && attempts.length > 0) {
      return res.json({ ok: false, note: 'No jobs scraped; see attempts for details', ...resp });
    }

    return res.json({ ok: true, ...resp });
  })
);

/* ----------------------------- STANDARD JOB ROUTES ---------------------------- */
api.get(
  '/jobs',
  asyncH(async (req, res) => {
    const q = {};
    if (req.query.q) q.$text = { $search: req.query.q };
    if (req.query.jobType) q.jobType = req.query.jobType;
    if (req.query.location) q.location = new RegExp(`^${req.query.location}$`, 'i');
    if (req.query.category) q.categories = req.query.category;
    if (req.query.approvedOnly === 'true') q.isApproved = true;
    if (req.query.status) q.status = req.query.status;

    const jobs = await Job.find(q)
      .populate('company', 'name logoUrl location website industry email phone')
      .sort({ createdAt: -1 });
    res.json(jobs);
  })
);

api.get(
  '/jobs/categories',
  asyncH(async (_req, res) => {
    const list = await Job.distinct('categories', { categories: { $ne: null } });
    res.json(list.filter(Boolean).sort());
  })
);

api.get(
  '/jobs/:id',
  asyncH(async (req, res) => {
    const job = await Job.findById(req.params.id)
      .populate('company', 'name logoUrl location website industry email phone');
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  })
);

api.post(
  '/jobs',
  asyncH(async (req, res) => {
    if (req.body.company) {
      const exists = await Company.exists({ _id: req.body.company });
      if (!exists) return res.status(400).json({ error: 'Invalid company ID' });
    }
    const job = await Job.create({
      ...req.body,
      status: req.body.status || 'active',
      isApproved: true,
    });
    await job.populate('company', 'name logoUrl location website industry email phone');
    res.status(201).json(job);
  })
);

api.put(
  '/jobs/:id',
  asyncH(async (req, res) => {
    if (req.body.company) {
      const exists = await Company.exists({ _id: req.body.company });
      if (!exists) return res.status(400).json({ error: 'Invalid company ID' });
    }
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('company', 'name logoUrl location website industry email phone');
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  })
);

api.delete(
  '/jobs/:id',
  asyncH(async (req, res) => {
    const deleted = await Job.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Job not found' });
    res.json({ deleted: true });
  })
);

/* -------------------------------- COMPANIES --------------------------------- */
const isValidEmail = (v) => (typeof v === 'string' ? /.+\@.+\..+/.test(v) : false);
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
  if (typeof src.isActive === 'boolean') out.isActive = src.isActive;
  return out;
};

api.get(
  '/companies',
  asyncH(async (_req, res) => {
    const companies = await Company.find().sort({ createdAt: -1 });
    res.json({ companies });
  })
);

api.get(
  '/companies/:id',
  asyncH(async (req, res) => {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ company });
  })
);

api.post(
  '/companies',
  asyncH(async (req, res) => {
    const body = pickCompanyFields(req.body);

    if (!body.name) return res.status(400).json({ message: 'Company name is required' });

    const dup = await Company.findOne({ name: body.name });
    if (dup) return res.status(409).json({ message: 'Company already exists' });

    if (body.email && !isValidEmail(body.email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const company = await Company.create({
      ...body,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
    });

    res.status(201).json({ company });
  })
);

api.put(
  '/companies/:id',
  asyncH(async (req, res) => {
    const update = pickCompanyFields(req.body);

    if (update.name) {
      const clash = await Company.findOne({ name: update.name, _id: { $ne: req.params.id } });
      if (clash) return res.status(409).json({ message: 'Company name already in use' });
    }

    if (update.email && !isValidEmail(update.email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const company = await Company.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });

    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ company });
  })
);

api.delete(
  '/companies/:id',
  asyncH(async (req, res) => {
    const deleted = await Company.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Company not found' });
    res.json({ message: 'Company deleted' });
  })
);

/* ---------------------------------- USERS (Public/Generic) ------------------- */
api.get(
  '/users',
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
  '/users/:id',
  asyncH(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  })
);

api.post(
  '/users',
  asyncH(async (req, res) => {
    const user = await User.create(req.body); // ensure model hashes password
    res.status(201).json(user);
  })
);

api.put(
  '/users/:id',
  asyncH(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  })
);

api.delete(
  '/users/:id',
  asyncH(async (req, res) => {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    res.json({ deleted: true });
  })
);

/* ------------------------------- ADMIN USERS -------------------------------- */
api.get(
  '/admin/users',
  requireAdmin,
  asyncH(async (_req, res) => {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  })
);

api.get(
  '/admin/users/:id',
  requireAdmin,
  asyncH(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  })
);

api.post(
  '/admin/users',
  requireAdmin,
  asyncH(async (req, res) => {
    const {
      role, userType, firstName, lastName, email,
      password, studentId, course, yearLevel, phone, status
    } = req.body || {};

    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (exists) return res.status(409).json({ error: 'Email already exists' });

    const hash = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      role: (role || userType || 'Student').toLowerCase(),
      firstName, lastName,
      email: String(email).toLowerCase().trim(),
      password: hash,
      studentId, course, yearLevel, phone,
      status: status || 'active',
    });

    res.status(201).json(user);
  })
);

api.put(
  '/admin/users/:id',
  requireAdmin,
  asyncH(async (req, res) => {
    const update = { ...req.body };
    if (update.password) {
      update.password = await bcrypt.hash(String(update.password), 10);
    }
    if (update.email) {
      update.email = String(update.email).toLowerCase().trim();
    }
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  })
);

api.delete(
  '/admin/users/:id',
  requireAdmin,
  asyncH(async (req, res) => {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    res.json({ deleted: true });
  })
);

/* ------------------------------- STUDENT STATS ------------------------------ */
api.get(
  '/student/stats',
  requireAuth,
  asyncH(async (req, res) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Available jobs: count all active jobs (uniform with admin)
      const availableJobs = await Job.countDocuments({ status: 'active' });

      // Jobs viewed (search logs)
      const viewed = await SearchLog.countDocuments({ user: req.userId, role: /student/i });

      // Companies
      const companies = await Company.countDocuments();

      res.json({
        success: true,
        availableJobs,
        jobsViewed: viewed,
        companies,
      });
    } catch (err) {
      console.error('Student stats error:', err);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  })
);

// Add admin stats endpoint (uniform with student stats)
api.get(
  '/admin/stats',
  requireAdmin,
  asyncH(async (_req, res) => {
    try {
      // Available jobs: count all active jobs (same logic as student)
      const availableJobs = await Job.countDocuments({ status: 'active' });
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
      console.error('Admin stats error:', err);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  })
);

/* ------------------------------ ANALYTICS (search) --------------------------- */
api.post(
  '/analytics/search',
  asyncH(async req => {
    const raw = String(req.body?.term || '').trim();
    if (!raw) return res.status(400).json({ ok: false, error: 'term required' });

    let userId = null;
    let role = 'guest';
    const tok = getTokenFromReq(req);
    if (tok) {
      try {
        const payload = jwt.verify(tok, JWT_SECRET);
        userId = payload.sub || null;
        role = (payload.role || 'guest').toLowerCase();
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

/* ------------------------------- Mount API routes --------------------------- */
app.use('/api', api);

/* ---------------------------- Serve Frontend Build --------------------------- */
const frontendPath = path.join(__dirname, "../frontend/build");
app.use(express.static(frontendPath));
app.get("*", (req, res) => {
  if (req.originalUrl.startsWith("/api"))
    return res.status(404).json({ error: "API route not found" });
  res.sendFile(path.join(frontendPath, "index.html"));
});

/* -------------------------- Error Handlers & Start --------------------------- */
app.use((err, _req, res, _next) => {
  console.error('[API Error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ API running on port ${PORT}`);
  try {
    const table = listEndpoints(app).map((e) => ({
      methods: e.methods.join(','),
      path: e.path,
    }));
    console.table(table);
  } catch (_) {}
});