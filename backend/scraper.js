/* ----------------------------- JOB SCRAPING (INDEED + SCRAPERAPI) ---------------------------- */

const axios = require("axios");
const cheerio = require("cheerio");
const Job = require("../models/Job"); // ensure correct relative path

async function scrapeAviationJobs() {
  const API_KEY = process.env.SCRAPERAPI_KEY;

  if (!API_KEY) {
    console.error("❌ Missing SCRAPERAPI_KEY");
    return [];
  }

  // Search aviation-related jobs
  const targetURL =
    "https://ph.indeed.com/jobs?q=aircraft+OR+avionics+OR+aviation+technician+OR+mechanic+OR+engineer&l=Philippines";

  const scraperURL = `https://api.scraperapi.com?api_key=${API_KEY}&url=${encodeURIComponent(
    targetURL
  )}`;

  console.log("[SCRAPER] Fetching Indeed using ScraperAPI…");

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
    console.error("[SCRAPER ERROR] Failed fetch:", err.message);
    return [];
  }

  const html = response.data;
  const $ = cheerio.load(html);
  const jobs = [];

  $(".job_seen_beacon").each((_, el) => {
    const title = $(el).find("h2 a").text().trim();
    const company = $(el).find(".companyName").text().trim();
    const location = $(el).find(".companyLocation").text().trim();
    const link =
      "https://ph.indeed.com" + ($(el).find("h2 a").attr("href") || "");

    if (title && company) {
      jobs.push({ title, company, location, link });
    }
  });

  console.log(`[SCRAPER] Found ${jobs.length} jobs`);
  return jobs;
}

module.exports = scrapeAviationJobs;
