import type { NextApiRequest, NextApiResponse } from 'next'
import puppeteer, { Browser } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import fs from 'fs/promises'
import path from 'path'
import { parseUrlPathname } from '@/lib/context/url-parser'
import { SocialCard, SocialCardProps } from '@/components/SocialCard'

// Default config since siteConfig might not be available
const defaultConfig = {
  name: 'Next Notion Engine',
  description: 'A modern blog built with Next.js and Notion'
}

import { getDefaultBackgroundUrl as getDefaultBg } from '@/lib/get-default-background'

// Helper function to get default background URL
async function getDefaultBackgroundUrl(req?: NextApiRequest): Promise<string> {
  return getDefaultBg()
}

// Internal core rendering function
async function renderSocialImage(
  browser: Browser,
  props: SocialCardProps
): Promise<Buffer> {
  const element = React.createElement(SocialCard, props)
  const html = ReactDOMServer.renderToStaticMarkup(element)

  if (!browser.isConnected()) {
    throw new Error('Browser is not connected.')
  }

  const page = await browser.newPage()
  let screenshot: Buffer

  try {
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
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
    const imageBuffer = await renderSocialImage(browser, props)
    await fs.writeFile(imagePath, imageBuffer)
    console.log(`[SocialImage] Generated image for '${slug}' at ${imagePath}`)
    return publicUrl
  } catch (error) {
    console.error(`[SocialImage] Failed to generate image for '${slug}':`, error)
    throw error
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

// API handler for on-demand previews
async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let browser: Browser | null = null
  try {
    const isProduction = process.env.NODE_ENV === 'production'
    let executablePath: string

    if (isProduction) {
      executablePath = await chromium.executablePath()
    } else {
      try {
        executablePath = puppeteer.executablePath()
      } catch (error) {
        console.error('Could not find a browser for Puppeteer.')
        throw new Error(
          'Please install the full `puppeteer` package (`pnpm add puppeteer`) to automatically download a browser, or set the `PUPPETEER_EXECUTABLE_PATH` environment variable.'
        )
      }
    }

    browser = await puppeteer.launch({
      args: isProduction ? chromium.args : [],
      defaultViewport: { width: 1200, height: 630 },
      executablePath,
      headless: (isProduction ? chromium.headless : 'new') as any,
    })

    const urlPath = req.query.path as string || '/'
    const parsedUrl = parseUrlPathname(urlPath)

    if (!parsedUrl.isRoot) {
      return res.status(400).json({ error: 'Only root path / is supported for now.' })
    }

    const imageUrl = await getDefaultBackgroundUrl(req)

    const imageBuffer = await renderSocialImage(browser, {
      title: defaultConfig.name,
      author: defaultConfig.description,
      imageUrl
    })

    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 's-maxage=0, stale-while-revalidate')
    res.status(200).end(imageBuffer)

  } catch (error) {
    console.error('[generate-social-image] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
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
