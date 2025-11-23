/* ----------------------------- JOB SCRAPING (INDEED MULTI-PAGE) ---------------------------- */

const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeAviationJobs() {
  const API_KEY = process.env.SCRAPERAPI_KEY;
  if (!API_KEY) {
    console.error("❌ Missing SCRAPERAPI_KEY");
    return [];
  }

  // Base Indeed search
  const BASE_URL =
    "https://ph.indeed.com/jobs?q=aviation+OR+aircraft+OR+avionics+OR+technician+OR+mechanic+OR+engineer&l=Philippines";

  // CHANGE THIS NUMBER TO SCRAPE MORE PAGES (1 page ≈ 10–15 jobs)
  const pagesToScrape = 2; // 👈 5 pages ≈ 50–75 jobs

  const allJobs = [];

  console.log(`✈ [SCRAPER] Scraping Indeed (${pagesToScrape} pages)…`);

  for (let i = 0; i < pagesToScrape; i++) {
    const start = i * 10; // pagination
    const pageURL = `${BASE_URL}&start=${start}`;

    console.log(`📄 Scraping page ${i + 1}: ${pageURL}`);

    const scraperURL =
      `https://api.scraperapi.com?api_key=${API_KEY}&url=` +
      encodeURIComponent(pageURL);

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
      console.error(`❌ Failed to fetch page ${i + 1}:`, err.message);
      continue;
    }

    const html = response.data;
    const $ = cheerio.load(html);

    // MAIN selector
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

      if (title && company) allJobs.push({ title, company, location, link });
    });

    // FALLBACK selector
    $("a.tapItem").each((_, el) => {
      const title = $(el).find(".jobTitle>span").text().trim();
      const company = $(el).find(".companyName").text().trim();
      const location = $(el).find(".companyLocation").text().trim();
      const linkRaw = $(el).attr("href") || "";

      if (title && company) {
        const link = linkRaw.startsWith("http")
          ? linkRaw
          : "https://ph.indeed.com" + linkRaw;

        allJobs.push({ title, company, location, link });
      }
    });
  }

  // Deduplicate
  const unique = [];
  const seen = new Set();

  for (const j of allJobs) {
    const key = j.title + "|" + j.company;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(j);
    }
  }

  console.log(`✔ [SCRAPER] Total extracted jobs: ${unique.length}`);

  return unique;
}

module.exports = scrapeAviationJobs;
