import React, { useEffect, useMemo, useState, useRef } from "react";
import { jobsAPI, normalizeWebsite, getImageUrl } from "../utils/api";
import {
  Search,
  Briefcase,
  MapPin,
  Building2,
  ChevronDown,
} from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";

async function scrapeJobs(query = "aviation") {
  const targetURL = `https://mycareers.ph/job-search?query=${encodeURIComponent(query)}`;

  // 1. Fetch HTML from frontend (allowed by browser)
  const html = await fetch(targetURL).then(res => res.text());

  // 2. Convert to Base64 for backend
  const htmlBase64 = btoa(unescape(encodeURIComponent(html)));

  // 3. Send HTML to backend for parsing
  const result = await fetch("https://aerojob-backend-production.up.railway.app/api/jobs/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: query,
      htmlBase64
    })
  }).then(res => res.json());

  console.log("SCRAPER RESULT:", result);
  return result;
}

/* --- time ago helper --- */
const timeAgo = (isoOrDate) => {
  if (!isoOrDate) return "";
  const d = new Date(isoOrDate);
  const diff = Math.max(0, Date.now() - d.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
};

const JOB_TYPES = [
  { value: "", label: "All types" },
  { value: "internship", label: "Internship" },
  { value: "ojt", label: "OJT" },
  { value: "part-time", label: "Part-time" },
  { value: "full-time", label: "Full-time" },
  { value: "contract", label: "Contract" },
];

/* --- fallback logo --- */
const PlaceholderLogo =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'>
      <rect width='100%' height='100%' fill='#f3f4f6'/>
      <text x='50%' y='54%' font-size='16' text-anchor='middle' fill='#9ca3af'>🏢</text>
    </svg>`
  );

function CompanyLogo({ url, alt }) {
  const [src, setSrc] = useState(getImageUrl(url) || PlaceholderLogo);
  return (
    <img
      src={src || PlaceholderLogo}
      alt={alt || "Company logo"}
      className="w-10 h-10 rounded-md object-cover bg-gray-100 border"
      onError={() => setSrc(PlaceholderLogo)}
      loading="lazy"
    />
  );
}

/* --- analytics helper --- */
async function logSearchTerm(term) {
  try {
    const base =
      import.meta?.env?.VITE_API_BASE_URL || process.env.REACT_APP_API_BASE_URL;
    if (!base) return;
    await fetch(`${base.replace(/\/$/, "")}/api/analytics/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term }),
      credentials: "include",
    });
  } catch (_) {}
}

export default function Jobs() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");

  const lastLoggedRef = useRef("");

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const fetchJobs = async (params = {}) => {
    try {
      setLoading(true);
      const data = await jobsAPI.list({
        approvedOnly: true,
        status: "active",
        ...params,
      });
      setJobs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs({ approvedOnly: true, status: "active" });
  }, []);

  useEffect(() => {
    (async () => {
      const params = { approvedOnly: true, status: "active" };
      if (q) params.q = q;
      if (type) params.jobType = type;
      await fetchJobs(params);

      if (q && q.length >= 2 && lastLoggedRef.current !== q) {
        lastLoggedRef.current = q;
        logSearchTerm(q.toLowerCase());
      }
    })();
  }, [q, type]);

  const hasFilters = useMemo(() => !!(q || type || location), [q, type, location]);

  // ✅ Local filter for location (partial, case-insensitive)
  const filteredJobs = useMemo(() => {
    const lq = location.trim().toLowerCase();
    if (!lq) return jobs;
    return jobs.filter((job) => job.location?.toLowerCase().includes(lq));
  }, [jobs, location]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Heading */}
      <div className="mb-6">
        <h1 className="text-[28px] sm:text-3xl font-bold tracking-tight">
          Internships and Jobs Available:
        </h1>
        <p className="text-gray-600 mt-1">
          Browse active and approved opportunities for PhilSCA Students & Alumni.
        </p>
      </div>


      {/* Filter Bar */}
      <div className="bg-white/70 backdrop-blur border rounded-2xl shadow-sm p-3 sm:p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
          {/* Search */}
          <div className="sm:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Search job titles, skills…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>



          {/* Type */}
          <div>
            <div className="relative">
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full appearance-none pr-8 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {JOB_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="w-full py-2.5 rounded-xl border px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        
      <button
        onClick={async () => {
          const res = await fetch(
            "https://aerojob-backend-production.up.railway.app/api/jobs/scrape"
          ).then(r => r.json());

          console.log(res);
          alert("Scraped " + (res.found || 0) + " jobs!");
        }}
      >
        🔄 Scrape Aviation Jobs
      </button>


        {hasFilters && (
          <div className="mt-3">
            <button
              onClick={() => {
                setQInput("");
                setType("");
                setLocation("");
                lastLoggedRef.current = "";
              }}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="py-20">
          <LoadingSpinner />
        </div>
      ) : filteredJobs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

/* --- Components --- */
function JobCard({ job }) {
  const logoUrl = job?.company?.logoUrl ? getImageUrl(job.company.logoUrl) : "";

  return (
    <article className="group bg-white border rounded-2xl shadow-sm p-5 hover:shadow-md transition">
      <header className="mb-3 flex items-start gap-3">
        <CompanyLogo url={logoUrl} alt={job.company?.name} />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-snug group-hover:text-indigo-700 truncate">
            {job.title}
          </h2>
          <p className="text-xs text-gray-500">{timeAgo(job.createdAt)}</p>
        </div>
      </header>

      <p className="text-sm text-gray-700 mb-4">
        {job.shortDescription
          ? job.shortDescription
          : job.description
          ? job.description.slice(0, 120) +
            (job.description.length > 120 ? "…" : "")
          : ""}
      </p>

      <ul className="text-sm text-gray-600 space-y-1 mb-5">
        <li className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span>{job.company?.name || "Company not specified"}</span>
        </li>
        <li className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span>{job.location || "Location not specified"}</span>
        </li>
        <li className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          <span className="capitalize">{job.jobType || "—"}</span>
        </li>
      </ul>

      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            const site = normalizeWebsite(job?.company?.website);
            if (site) {
              window.open(site, "_blank", "noopener,noreferrer");
            } else {
              alert("No company website available for this job.");
            }
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Apply Now
        </button>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="rounded-2xl border p-6">
        <Briefcase className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold">No matching active jobs.</h3>
      <p className="text-gray-600 text-sm">
        Try clearing filters or adjusting your search.
      </p>
    </div>
  );
}
