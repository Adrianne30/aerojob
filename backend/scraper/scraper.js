/* ----------------------------- JOB SCRAPING (INDEED + PAGINATION) ---------------------------- */

const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeAviationJobs(maxPages = 5) {
  const API_KEY = process.env.SCRAPERAPI_KEY;

  if (!API_KEY) {
    console.error("❌ Missing SCRAPERAPI_KEY");
    return [];
  }

  const BASE_URL =
    "https://ph.indeed.com/jobs?q=aviation+OR+aircraft+OR+avionics+OR+technician+OR+mechanic+OR+engineer&l=Philippines";

  let allJobs = [];

  for (let page = 0; page < maxPages; page++) {
    const start = page * 10;
    const pageURL = `${BASE_URL}&start=${start}`;

    console.log(`📄 Scraping page ${page + 1}: ${pageURL}`);

    const scraperURL = `https://api.scraperapi.com?api_key=${API_KEY}&url=${encodeURIComponent(
      pageURL
    )}`;

    let response;
    try {
      response = await axios.get(scraperURL, {
        timeout: 30000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "text/html",
        },
      });
    } catch (err) {
      console.error(`❌ Failed to fetch page ${page + 1}:`, err.message);
      break;
    }

    const $ = cheerio.load(response.data);
    let jobs = [];

    /* ---------- MAIN SELECTOR ---------- */
    $(".job_seen_beacon").each((_, el) => {
      const title =
        $(el).find("h2 a").text().trim() ||
        $(el).find("h2 span").text().trim();

      const company =
        $(el).find(".companyName").text().trim() ||
        $(el).find(".company_location").text().trim();

      const location =
        $(el).find(".companyLocation").text().trim() ||
        $(el).find(".company_location").text().trim();

      const linkRaw = $(el).find("h2 a").attr("href") || "";
      const link = linkRaw.startsWith("http")
        ? linkRaw
        : "https://ph.indeed.com" + linkRaw;

      if (title && company) {
        jobs.push({ title, company, location, link });
      }
    });

    /* ---------- FALLBACK SELECTOR ---------- */
    $("a.tapItem").each((_, el) => {
      const title = $(el).find(".jobTitle > span").text().trim();
      const company = $(el).find(".companyName").text().trim();
      const location = $(el).find(".companyLocation").text().trim();
      const linkRaw = $(el).attr("href");

      if (title && company) {
        const link = linkRaw.startsWith("http")
          ? linkRaw
          : "https://ph.indeed.com" + linkRaw;
        jobs.push({ title, company, location, link });
      }
    });

    console.log(`✔ Page ${page + 1} found: ${jobs.length} jobs`);

    if (jobs.length === 0) {
      console.log("🛑 No more jobs found. Stopping...");
      break;
    }

    allJobs.push(...jobs);
  }

  /* ---------- Deduplicate ---------- */
  const unique = [];
  const seen = new Set();

  for (const j of allJobs) {
    const key = j.title + "|" + j.company;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(j);
    }
  }

  console.log(`🎉 TOTAL Extracted: ${unique.length} aviation jobs`);

  return unique;
}

module.exports = scrapeAviationJobs;
