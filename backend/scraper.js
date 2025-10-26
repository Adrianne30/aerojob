// scraper.js
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeAviationJobs() {
  const url = 'https://ph.indeed.com/jobs?q=aircraft+technician';
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const jobs = [];
  $('.job_seen_beacon').each((_, el) => {
    const title = $(el).find('h2 a').text().trim();
    const company = $(el).find('.companyName').text().trim();
    const location = $(el).find('.companyLocation').text().trim();
    const link = 'https://ph.indeed.com' + $(el).find('h2 a').attr('href');
    if (title) jobs.push({ title, company, location, link });
  });

  return jobs;
}

module.exports = { scrapeAviationJobs };
