import puppeteer, { type Browser } from 'puppeteer'
import chromium from '@sparticuz/chromium'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import { SocialCard, SocialCardProps } from '../components/SocialCard'
import siteConfig from '../site.config.ts'

// Browser instance cache for reuse
let cachedBrowser: Browser | null = null
let browserPromise: Promise<Browser> | null = null

// Get or create browser instance
export async function getBrowser(): Promise<Browser> {
  if (cachedBrowser && cachedBrowser.isConnected()) {
    console.log('[getBrowser] Reusing cached browser')
    return cachedBrowser
  }

  if (browserPromise) {
    console.log('[getBrowser] Awaiting existing browser promise')
    return browserPromise
  }

  console.log('[getBrowser] Creating new browser instance')
  
  const _launchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-plugins',
    ]
  }

  try {
    // Check environment - skip Chromium for local development
    const isProductionServerless = (process.env.VERCEL === '1' || process.env.NETLIFY === 'true') && 
                                  process.env.NODE_ENV === 'production';
    
    if (isProductionServerless && chromium) {
      console.log('[getBrowser] Using Chromium for serverless production')
      const executablePath = await chromium.executablePath()
      browserPromise = puppeteer.launch({
        headless: true,
        args: chromium.args || [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-plugins',
        ],
        executablePath,
      })
    } else {
      console.log('[getBrowser] Using local Puppeteer - bundled browser')
      // For local development, use the browser bundled with the puppeteer package.
      browserPromise = puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-plugins',
        ],
        executablePath: puppeteer.executablePath(),
      })
    }

    const browser = await browserPromise
    if (!browser) {
      throw new Error('Failed to launch browser')
    }
    cachedBrowser = browser
    console.log('[getBrowser] Browser launched successfully')
    return browser
  } catch (err) {
    console.error('[getBrowser] Failed to launch browser:', err)
    console.error('[getBrowser] Error details:', {
      code: (err as NodeJS.ErrnoException).code,
      errno: (err as NodeJS.ErrnoException).errno,
      syscall: (err as NodeJS.ErrnoException).syscall,
      message: (err as Error).message
    });
    
    // Provide helpful error message for ENOEXEC
    if ((err as NodeJS.ErrnoException).code === 'ENOEXEC') {
      console.error('[getBrowser] ENOEXEC: This usually means the browser executable is not compatible with your system')
      console.error('[getBrowser] For local development, ensure Chrome/Chromium is installed and accessible')
      console.error('[getBrowser] Try: npm install puppeteer --save-dev')
    }
    
    browserPromise = null
    throw err
  } finally {
    browserPromise = null
  }
}

// Internal core rendering function
export async function renderSocialImage(
  browser: Browser,
  props: SocialCardProps
): Promise<Buffer> {
  if (!browser.isConnected()) {
    throw new Error('Browser is not connected.')
  }

  const page = await browser.newPage()

  // Optimize: Disable unnecessary features for faster rendering
  await page.setRequestInterception(true);
  
  // Block unnecessary resource types for faster loading
  const blockedResourceTypes = ['stylesheet', 'font', 'script', 'image'];
  
  page.on('request', (request) => {
    const resourceType = request.resourceType();
    const url = request.url();
    
    // Allow documents and images (including external domains)
    if (resourceType === 'document' || resourceType === 'image') {
      request.continue();
    } else {
      // Allow fonts and stylesheets for better rendering
      const allowedExtensions = ['.css', '.woff', '.woff2', '.ttf', '.otf'];
      const hasAllowedExtension = allowedExtensions.some(ext => url.toLowerCase().includes(ext));
      if (hasAllowedExtension) {
        request.continue();
      } else {
        request.abort();
      }
    }
  });

  try {
    await page.setViewport({ width: 1200, height: 630 })
    
    const baseUrl = props.baseUrl || `https://${siteConfig.domain}`;
    
    // Generate HTML once and reuse
    const element = React.createElement(SocialCard, props)
    const html = ReactDOMServer.renderToStaticMarkup(element)
    
    // Optimized HTML with base URL injected directly
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <base href="${baseUrl}">
          <meta charset="utf-8">
          <style>
            body { margin: 0; padding: 0; }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    await page.setContent(fullHtml, {
      waitUntil: 'networkidle0', // Wait for network to be idle for external images
      timeout: 10000 // Increased timeout for external image loading
    })

    // Wait for all images to load
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve, reject) => {
            img.addEventListener('load', resolve);
            img.addEventListener('error', resolve); // Resolve on error to prevent hanging
            setTimeout(resolve, 3000); // Timeout after 3 seconds
          });
        })
      );
    });

    // Minimal wait for fonts only if needed
    try {
      await page.evaluateHandle('document.fonts.ready')
    } catch {
      // Continue if fonts fail to load
    }
    
    // Brief wait for any remaining rendering
    await new Promise(resolve => setTimeout(resolve, 500));

    const screenshotData = await page.screenshot({ 
      type: 'jpeg',
      quality: 70,
      omitBackground: false
    })
    
    if (!screenshotData) {
      throw new Error('Failed to create screenshot')
    }
    return Buffer.from(screenshotData)
  } finally {
    await page.close()
  }
}


// Exported function for file system generation (ISR/build-time)
export async function generateSocialImage(
  props: SocialCardProps,
  imagePath: string,
  publicUrl: string
): Promise<string> {
  const socialImagesDir = path.dirname(imagePath);

  try {
    // Use fs.mkdir to create parent directories
    await fs.mkdir(socialImagesDir, { recursive: true });
    // Check if file exists
    await fs.access(imagePath);
    return publicUrl;
  } catch {
    // File doesn't exist, so we'll generate it.
  }

  try {
    const browser = await getBrowser();
    // Base URL for resolving assets inside Puppeteer
    const baseUrl = process.env.VERCEL ? `https://${siteConfig.domain}` : 'http://localhost:3000';

    const imageBuffer = await renderSocialImage(browser, {
      ...props,
      baseUrl
    });
    
    await fs.writeFile(imagePath, imageBuffer);
    return publicUrl;
  } catch (err) {
    console.error(`[SocialImage] Failed to generate image for URL '${props.url}':`, err);
    throw err;
  }
}