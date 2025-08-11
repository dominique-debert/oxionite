import type { NextApiRequest, NextApiResponse } from 'next'
import puppeteer, { type Browser } from 'puppeteer'
import chromium from '@sparticuz/chromium'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import { parseUrlPathname } from '@/lib/context/url-parser'
import { SocialCard, SocialCardProps } from '@/components/SocialCard'
import siteConfig from 'site.config'

import { detectBestBackgroundFormatOnServer } from '@/lib/get-default-background.server'

// Default config since siteConfig might not be available
const defaultConfig = {
  name: 'Next Notion Engine',
  description: 'A modern blog built with Next.js and Notion'
}

// Helper function to get default background URL
async function getDefaultBackgroundUrl(_req?: NextApiRequest): Promise<string> {
  // We use the server-side detection method here as this API route runs in a Node.js environment
  return detectBestBackgroundFormatOnServer()
}

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
      waitUntil: 'load' // Wait for the main document and its resources to load
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
  let browser: Browser | null = null
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1200, height: 630 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })
    const baseUrl = `https://${siteConfig.domain}`
    const absoluteImageUrl = new URL(props.imageUrl || '/default_background.png', baseUrl).toString()

    console.log('[SocialImage Generator] Debug Info (Build-time):', {
      originalImageUrl: props.imageUrl,
      baseUrl,
      finalAbsoluteUrl: absoluteImageUrl
    })


    const imageBuffer = await renderSocialImage(browser, {
      ...props,
      imageUrl: absoluteImageUrl,
      baseUrl: baseUrl
    })
    await fs.writeFile(imagePath, imageBuffer)
    console.log(`[SocialImage] Generated image for '${slug}' at ${imagePath}`)
    return publicUrl
  } catch (err) {
    console.error(`[SocialImage] Failed to generate image for '${slug}':`, err)
    throw err
  } finally {
    if (browser) {
      await browser.close()
    }
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

  let browser: Browser | null = null
  try {
    const isProduction = process.env.NODE_ENV === 'production'
    let executablePath: string = ''

    if (isProduction) {
      executablePath = await chromium.executablePath()
    } else {
      try {
        // Use Puppeteer's built-in executable path detection
        executablePath = puppeteer.executablePath()
      } catch (error) {
        console.error('Could not find a browser for Puppeteer:', error)
        throw new Error(
          'Please install the full puppeteer package or set PUPPETEER_EXECUTABLE_PATH environment variable. Try: npm install puppeteer'
        )
      }
    }

    browser = await puppeteer.launch({
      args: isProduction ? chromium.args : [],
      defaultViewport: { width: 1200, height: 630 },
      executablePath,
      headless: isProduction ? chromium.headless : false,
      slowMo: isProduction ? 0 : 100, // Slow down in dev for easier debugging
    })

    const urlPath = _req.query.path as string || '/'
    const parsedUrl = parseUrlPathname(urlPath)

    if (!parsedUrl.isRoot) {
      return res.status(400).json({ error: 'Only root path / is supported for now.' })
    }

    const imageUrl = await getDefaultBackgroundUrl(_req)

    // Determine base URL for assets
    const protocol = _req.headers['x-forwarded-proto'] || 'http'
    const host = _req.headers['x-forwarded-host'] || _req.headers.host
    const baseUrl = `${protocol}://${host}`

    const absoluteImageUrl = new URL(imageUrl, baseUrl).toString()

    console.log('[SocialImage API] Debug Info (On-demand):', {
      originalImageUrl: imageUrl,
      baseUrl,
      finalAbsoluteUrl: absoluteImageUrl
    })

    const imageBuffer = await renderSocialImage(browser, {
      title: defaultConfig.name,
      author: defaultConfig.description,
      imageUrl: absoluteImageUrl,
      url: '/',
      baseUrl: baseUrl
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
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

export default handler
