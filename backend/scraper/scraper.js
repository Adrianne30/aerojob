/* ----------------------------- JOB SCRAPING (INDEED) ---------------------------- */

const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeAviationJobs() {
  const API_KEY = process.env.SCRAPERAPI_KEY;

  if (!API_KEY) {
    console.error("❌ Missing SCRAPERAPI_KEY");
    return [];
  }

  // Broader aviation/aircraft search
  const targetURL =
    "https://ph.indeed.com/jobs?q=aviation+OR+aircraft+OR+avionics+OR+technician+OR+mechanic+OR+engineer+IT&l=Philippines";

  const scraperURL =
    `https://api.scraperapi.com?api_key=${API_KEY}&url=` +
    encodeURIComponent(targetURL);

  console.log("✈ [SCRAPER] Fetching Indeed via ScraperAPI…");

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
    console.error("❌ [SCRAPER ERROR] Fetch failed:", err.message);
    return [];
  }

  const html = response.data;
  const $ = cheerio.load(html);
  const jobs = [];

  // MAIN selector (typical Indeed layout)
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

  // FALLBACK selector (alternative Indeed card layout)
  $("a.tapItem").each((_, el) => {
    const title = $(el).find(".jobTitle>span").text().trim();
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

  // Deduplicate
  const unique = [];
  const seen = new Set();
  for (const j of jobs) {
    const key = j.title + "|" + j.company;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(j);
    }
  }

  console.log(`✔ [SCRAPER] Extracted ${unique.length} aviation jobs`);

  return unique;
}

module.exports = scrapeAviationJobs;
