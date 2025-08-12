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
  console.log('[SocialImage Renderer] Rendering with props:', props)

  const element = React.createElement(SocialCard, props)
  const html = ReactDOMServer.renderToStaticMarkup(element)

  if (!browser.isConnected()) {
    throw new Error('Browser is not connected.')
  }

  const page = await browser.newPage()

  // Capture console logs from the page and forward them to the terminal
  page
    .on('console', (message) =>
      console.log(`[Puppeteer Console] ${message.type().substring(0, 3).toUpperCase()} ${message.text()}`)
    )
    .on('pageerror', ({ message }) => console.log(`[Puppeteer Page Error] ${message}`))
    .on('requestfailed', (request) =>
      console.log(`[Puppeteer Request Failed] ${request.failure()?.errorText} ${request.url()}`)
    )

  let screenshot: Buffer

  try {
    await page.setViewport({ width: 1200, height: 630 })
    // Use `page.setContent` to load the HTML. This allows the page to make network requests
    // for resources like images and fonts from the correct origin.
    await page.setContent(html, {
      waitUntil: 'networkidle0' // Faster: wait for network to be idle (no pending requests)
    })

    // Wait for all fonts to be loaded
    await page.evaluateHandle('document.fonts.ready')

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
    return cachedBrowser
  }
  
  if (browserPromise) {
    return browserPromise
  }

  const isProduction = process.env.NODE_ENV === 'production'
  const launchOptions = {
    args: isProduction ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1200, height: 630 },
    executablePath: isProduction 
      ? await chromium.executablePath() 
      : undefined, // Let puppeteer auto-detect in dev
    headless: true, // Always headless for speed
    slowMo: 0, // Disable slow mode
  }

  browserPromise = puppeteer.launch(launchOptions)
  cachedBrowser = await browserPromise
  browserPromise = null
  
  // Handle browser disconnection
  cachedBrowser.on('disconnected', () => {
    cachedBrowser = null
  })
  
  return cachedBrowser
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
    const baseUrl = `https://${siteConfig.domain}`

    const imageBuffer = await renderSocialImage(browser, {
      ...props,
      baseUrl: baseUrl
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

    // Determine base URL for assets
    const protocol = _req.headers['x-forwarded-proto'] || 'http'
    const host = _req.headers['x-forwarded-host'] || _req.headers.host
    const baseUrl = `${protocol}://${host}`

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
        const { getBlockTitle, getPageProperty } = await import('notion-utils')
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
          const subpageInfo = {
            title: title || 'Untitled',
            pageId: pageId,
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
          
          // Add to enhanced site map
          enhancedSiteMap = {
            ...siteMap,
            pageInfoMap: {
              ...siteMap.pageInfoMap,
              [pageId]: subpageInfo
            }
          }
          
          // Also store subpage data for direct access
          subpageData = {
            title,
            coverImage: coverImageUrl
          }
        }
      } catch (error) {
        console.error('[SocialImage API] Error fetching subpage:', error)
        // Fallback to slug-based title if fetch fails
        const slugTitle = parsedUrl.subpage?.replace(/-[a-f0-9-]{36}$/i, '').replace(/-/g, ' ') || 'Untitled'
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
    const imageBuffer = await renderSocialImage(browser, {
      url: urlParam,
      imageUrl: explicitImageUrl,
      baseUrl: baseUrl,
      siteMap: enhancedSiteMap
    })

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
