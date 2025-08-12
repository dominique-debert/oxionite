/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable unicorn/prefer-dom-node-append */
/* eslint-disable unicorn/numeric-separators-style */

import type { NextApiRequest, NextApiResponse } from 'next'
import puppeteer, { type Browser } from 'puppeteer'
import chromium from '@sparticuz/chromium'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import { parseUrlPathname } from '@/lib/context/url-parser'
import { getCachedSiteMap } from '@/lib/context/site-cache'
import { SocialCard, SocialCardProps } from '@/components/SocialCard'
import siteConfig from 'site.config'

// Internal core rendering function
async function renderSocialImage(
  browser: Browser,
  props: SocialCardProps
): Promise<Buffer> {
  console.log('[SocialImage Renderer] Rendering with props:', {
    url: props.url,
    baseUrl: props.baseUrl,
    imageUrl: props.imageUrl,
    hasSiteMap: !!props.siteMap,
    siteMapPageCount: props.siteMap?.pageInfoMap ? Object.keys(props.siteMap.pageInfoMap).length : 0
  })

  const element = React.createElement(SocialCard, props)
  const html = ReactDOMServer.renderToStaticMarkup(element)
  console.log('[SocialImage Renderer] Generated HTML length:', html.length)
  console.log('[SocialImage Renderer] HTML preview:', html.slice(0, 500) + '...')

  if (!browser.isConnected()) {
    throw new Error('Browser is not connected.')
  }

  const page = await browser.newPage()

  // Enable request interception to handle local file loading
  await page.setRequestInterception(true);
  
  page.on('request', (request) => {
    const url = request.url();
    console.log(`[Puppeteer Request] ${url}`);
    
    // Allow all requests to proceed
    request.continue();
  });

  // Capture console logs from the page and forward them to the terminal
  page
    .on('console', (message) =>
      console.log(`[Puppeteer Console] ${message.type().slice(0, 3).toUpperCase()} ${message.text()}`)
    )
    .on('pageerror', ({ message }) => console.log(`[Puppeteer Page Error] ${message}`))
    .on('requestfailed', (request) =>
      console.log(`[Puppeteer Request Failed] ${request.failure()?.errorText} ${request.url()}`)
    )
    .on('request', (request) =>
      console.log(`[Puppeteer Request] ${request.url()}`)
    )
    .on('response', (response) =>
      console.log(`[Puppeteer Response] ${response.status()} ${response.url()}`)
    )

  let screenshot: Buffer

  try {
    await page.setViewport({ width: 1200, height: 630 })
    
    // Ensure consistent base URL - use localhost for dev, configured domain for prod
    const isLocalDev = process.env.NODE_ENV === 'development' || (props.baseUrl && props.baseUrl.includes('localhost'));
    const baseUrl = isLocalDev ? 'http://localhost:3000' : `https://${siteConfig.domain}`;
    console.log('[SocialImage Renderer] Using base URL:', baseUrl);
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      // Set base URL so relative image paths resolve correctly
    })

    // The HTML is already set via setContent, no need to manually inject it
    // This prevents the ReferenceError: html is not defined in page.evaluate context

    // Inject base URL for image resources
    await page.evaluate((base) => {
      const baseElement = document.createElement('base');
      baseElement.href = base;
      document.head.appendChild(baseElement);
      console.log('[SocialImage Renderer] Injected base URL:', base);
    }, baseUrl);

    // Wait for images to load with extended timeout
    await page.waitForSelector('img', { timeout: 10000 }).catch(() => {
      console.log('[SocialImage Renderer] No images found or timeout');
    });

    // Wait for network to be idle (images loaded) with longer idle time
    await page.waitForNetworkIdle({ idleTime: 2000 }).catch(() => {
      console.log('[SocialImage Renderer] Network idle timeout');
    });

    // Wait for all fonts to be loaded
    await page.evaluateHandle('document.fonts.ready')
    
    // Additional wait for any remaining resources
    await new Promise(resolve => setTimeout(resolve, 1000));

    const screenshotData = await page.screenshot({ type: 'png' })
    screenshot = Buffer.from(screenshotData)
  } finally {
    await page.close()
  }

  return screenshot
}

// Browser instance cache for reuse
let cachedBrowser: Browser | null = null
let browserPromise: Promise<Browser> | null = null

// Get or create browser instance
async function getBrowser(): Promise<Browser> {
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
      console.log('[getBrowser] Using local Puppeteer - auto-detecting browser')
      // For local development and npm run start, use system Chrome/Chromium
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
        // Let puppeteer auto-detect the browser - this will use local Chrome/Chromium
        executablePath: undefined,
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
    })
    
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

// Exported function for file system generation (ISR/build-time)
export async function generateSocialImage(
  slug: string,
  props: SocialCardProps
): Promise<string> {
  const socialImagesDir = path.join(process.cwd(), 'public', 'social-images')
  const imagePath = path.join(socialImagesDir, `${slug}.png`)
  const publicUrl = `/social-images/${slug}.png`

  try {
    await fs.mkdir(socialImagesDir, { recursive: true })
    await fs.access(imagePath)
    console.log(`[SocialImage] Image for '${slug}' already exists. Skipping generation.`)
    return publicUrl
  } catch {
    // File doesn't exist, proceed to generate it
  }

  console.log(`[SocialImage] Generating image for '${slug}'...`)
  try {
    const browser = await getBrowser()
    // Use localhost for development, configured domain for production
    const isDev = process.env.NODE_ENV === 'development'
    const baseUrl = isDev ? 'http://localhost:3000' : `https://${siteConfig.domain}`

    const imageBuffer = await renderSocialImage(browser, {
      ...props,
      baseUrl
    })
    await fs.writeFile(imagePath, imageBuffer)
    console.log(`[SocialImage] Generated image for '${slug}' at ${imagePath}`)
    return publicUrl
  } catch (err) {
    console.error(`[SocialImage] Failed to generate image for '${slug}':`, err)
    throw err
  }
}

// API handler for on-demand previews
async function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  if (_req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const urlPath = _req.query.path as string || '/'
    const parsedUrl = parseUrlPathname(urlPath)

    // Support all URL types, not just root
    console.log('[SocialImage API] Parsed URL:', parsedUrl)

    // Determine base URL based on environment
    const host = _req.headers.host || 'localhost:3000'
    const isDev = process.env.NODE_ENV === 'development' || host.includes('localhost')
    const baseUrl = isDev ? `http://${host}` : `https://${siteConfig.domain}`

    const urlParam = typeof _req.query.url === 'string' ? _req.query.url : 
                     typeof _req.query.path === 'string' ? _req.query.path : '/'
    
    console.log('[SocialImage API] Final URL parameter:', urlParam)
    
    const siteMap = await getCachedSiteMap()

    // Handle subpages by fetching actual Notion page data
    let enhancedSiteMap = siteMap;
    let subpageData = null;
    
    // Check if this is a subpage and extract page ID
    const pageIdMatch = urlParam.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
    
    if (pageIdMatch && parsedUrl.isSubpage) {
      const pageId = pageIdMatch[1];
      console.log('[SocialImage API] Subpage detected, fetching page:', pageId)
      
      try {
        // Import notion API client and utilities
        const { notion } = await import('@/lib/notion-api')
        const { getBlockTitle } = await import('notion-utils')
        const { mapImageUrl } = await import('@/lib/map-image-url')
        
        // Fetch the actual page data from Notion
        const recordMap = await notion.getPage(pageId)
        
        // Extract data from the fetched page
        const block = recordMap.block[pageId]?.value
        if (block) {
          const title = getBlockTitle(block, recordMap)
          const pageCover = block.format?.page_cover
          const coverImageUrl = pageCover ? mapImageUrl(pageCover, block) : null
          
          console.log('[SocialImage API] Fetched subpage data:', { title, coverImage: coverImageUrl })
          
          // Create enhanced page info for the subpage
          const _subpageInfo = {
            title: title || 'Untitled',
            pageId,
            type: 'Post' as const,
            slug: parsedUrl.subpage || pageId,
            parentPageId: null,
            childrenPageIds: [],
            language: null,
            public: true,
            useOriginalCoverImage: null,
            description: null,
            date: null,
            coverImage: coverImageUrl || undefined,
            children: []
          }
          
          // Also store subpage data for direct access
          subpageData = { title, coverImage: coverImageUrl }
        }
      } catch (err) {
        console.error('[SocialImage API] Error fetching subpage:', err)
        // Fallback to slug-based title if fetch fails
        const slugTitle = parsedUrl.subpage?.slice(0, -36).replace(/-/g, ' ') || 'Untitled'
        enhancedSiteMap = {
          ...siteMap,
          pageInfoMap: {
            ...siteMap.pageInfoMap,
            [pageIdMatch[1]]: {
              title: slugTitle,
              pageId: pageIdMatch[1],
              type: 'Post' as const,
              slug: parsedUrl.subpage || pageIdMatch[1],
              parentPageId: null,
              childrenPageIds: [],
              language: null,
              public: true,
              useOriginalCoverImage: null,
              description: null,
              date: null,
              coverImage: undefined,
              children: []
            }
          }
        }
      }
    }

    // Let the SocialCard handle default backgrounds and page-specific cover images
    // Only provide imageUrl if explicitly requested via query parameter
    const explicitImageUrl = typeof _req.query.imageUrl === 'string' ? _req.query.imageUrl : undefined

    console.log('[SocialImage API] Debug Info (On-demand):', {
      explicitImageUrl,
      baseUrl,
      requestUrl: _req.url,
      query: _req.query,
      hasSubpageData: !!subpageData
    })

    const browser = await getBrowser()
    console.log('[SocialImage API] Starting render with:', {
      url: urlParam,
      baseUrl,
      explicitImageUrl,
      hasSiteMap: !!enhancedSiteMap,
      siteMapKeys: enhancedSiteMap ? Object.keys(enhancedSiteMap) : []
    })
    
    const imageBuffer = await renderSocialImage(browser, {
      url: urlParam,
      imageUrl: explicitImageUrl,
      baseUrl,
      siteMap: enhancedSiteMap
    })

    console.log('[SocialImage API] Generated image buffer length:', imageBuffer.length)
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 's-maxage=0, stale-while-revalidate')
    res.status(200).end(imageBuffer)

  } catch (err) {
    console.error('[generate-social-image] Error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    res.status(500).json({ 
      error: 'Failed to generate social image.',
      details: errorMessage
    })
  }
}

export default handler
