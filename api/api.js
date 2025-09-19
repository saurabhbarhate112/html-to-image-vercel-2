import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  let browser = null;

  try {
    const { html, width = 1200, height = 800, format = 'png' } = req.body;

    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }

    // Configure Chromium for Vercel
    const options = {
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    };

    // Launch Puppeteer with Chromium
    browser = await puppeteer.launch(options);
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({
      width: parseInt(width),
      height: parseInt(height),
      deviceScaleFactor: 1
    });

    // Set content and wait for it to load
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000
    });

    // Take screenshot
    const screenshot = await page.screenshot({
      type: format,
      fullPage: true,
      encoding: 'base64'
    });

    await browser.close();
    browser = null;

    // Return base64 image
    res.status(200).json({
      success: true,
      image: `data:image/${format};base64,${screenshot}`,
      format: format,
      message: 'Image generated successfully'
    });

  } catch (error) {
    console.error('Error:', error);
    
    // Make sure browser is closed even if there's an error
    if (browser !== null) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate image',
      details: error.message
    });
  }
}
