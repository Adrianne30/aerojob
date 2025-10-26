/* ----------------------------- JOB SCRAPING (USING SCRAPERAPI) ---------------------------- */
const axios = require('axios');
const cheerio = require('cheerio');

// 🧩 Define the scraper function
async function scrapeAviationJobs() {
  const API_KEY = process.env.SCRAPERAPI_KEY;
  const targetURL =
    'https://ph.indeed.com/jobs?q=aircraft+technician+OR+aircraft+mechanic+OR+avionics+engineer';
  const scraperURL = `https://api.scraperapi.com?api_key=${API_KEY}&url=${encodeURIComponent(targetURL)}`;

  console.log('[SCRAPER] Fetching from Indeed via ScraperAPI...');

  const { data } = await axios.get(scraperURL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 30000, // 30s timeout
  });

  const $ = cheerio.load(data);
  const jobs = [];

  $('.job_seen_beacon').each((_, el) => {
    const title = $(el).find('h2 a').text().trim();
    const company = $(el).find('.companyName').text().trim();
    const location = $(el).find('.companyLocation').text().trim();
    const link = 'https://ph.indeed.com' + ($(el).find('h2 a').attr('href') || '');
    if (title && company) jobs.push({ title, company, location, link });
  });

  console.log(`[SCRAPER] Found ${jobs.length} jobs`);
  return jobs;
}

// 🧭 Route to trigger scraping
api.get(
  '/jobs/scrape',
  asyncH(async (_req, res) => {
    try {
      const scraped = await scrapeAviationJobs();

      for (const j of scraped) {
        const exists = await Job.findOne({ title: j.title, company: j.company });
        if (!exists) {
          await Job.create({
            title: j.title,
            description: 'External aviation job listing scraped from Indeed.',
            companyName: j.company,
            location: j.location,
            link: j.link,
            status: 'active',
            isApproved: true,
          });
        }
      }

      res.json({
        message: 'Scraping complete',
        count: scraped.length,
        preview: scraped.slice(0, 5),
      });
    } catch (error) {
      console.error('Scrape error:', error.message);
      res.status(500).json({ error: 'Failed to scrape jobs' });
    }
  })
);
