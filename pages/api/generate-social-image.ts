import type { NextApiRequest, NextApiResponse } from 'next'
import puppeteer, { Browser } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import fs from 'fs/promises'
import path from 'path'
import { parseUrlPathname } from '@/lib/context/url-parser'

// Default config since siteConfig might not be available
const defaultConfig = {
  name: 'Next Notion Engine',
  description: 'A modern blog built with Next.js and Notion'
}

// SocialCard component - moved here for self-contained file
interface SocialCardProps {
  title: string
  author?: string
  date?: string
  imageUrl?: string
}

const SocialCard: React.FC<SocialCardProps> = ({ title, author, date, imageUrl }) => {
  return React.createElement('div', {
    style: {
      width: 1200,
      height: 630,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }
  }, [
    // Glassmorphism overlay
    React.createElement('div', {
      key: 'overlay',
      style: {
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }
    }),
    // Content container
    React.createElement('div', {
      key: 'content',
      style: {
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        padding: '60px',
        maxWidth: '900px',
      }
    }, [
      React.createElement('h1', {
        key: 'title',
        style: {
          fontSize: '64px',
          fontWeight: 'bold',
          color: '#ffffff',
          marginBottom: '20px',
          lineHeight: 1.2,
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
        }
      }, title),
      author && React.createElement('p', {
        key: 'author',
        style: {
          fontSize: '32px',
          color: '#e5e7eb',
          marginBottom: date ? '8px' : '0',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
        }
      }, author),
      date && React.createElement('p', {
        key: 'date',
        style: {
          fontSize: '24px',
          color: '#9ca3af',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
        }
      }, date)
    ].filter(Boolean))
  ])
}

// Helper function to get default background URL
async function getDefaultBackgroundUrl(req?: NextApiRequest): Promise<string> {
  const publicDir = path.join(process.cwd(), 'public')
  const imagePath = path.join(publicDir, 'default_background.png')
  
  try {
    await fs.access(imagePath)
    
    if (req?.headers?.host) {
      const protocol = req.headers['x-forwarded-proto'] || 'http'
      return `${protocol}://${req.headers.host}/default_background.png`
    } else {
      return `http://localhost:3000/default_background.png`
    }
  } catch {
    // Fallback to gradient if file doesn't exist
    return `data:image/svg+xml;base64,${Buffer.from(`
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1200" height="630" fill="url(#grad)" />
      </svg>
    `).toString('base64')}`
  }
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
    // Handle Puppeteer executable path with multiple fallbacks
    let executablePath: string = ''
    try {
      if (process.env.NODE_ENV === 'production') {
        executablePath = await chromium.executablePath()
      } else {
        const possiblePaths = [
          () => puppeteer.executablePath(),
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
          '/usr/bin/google-chrome',
          '/usr/bin/chromium-browser',
          '/usr/bin/chrome',
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        ]

        for (const possiblePath of possiblePaths) {
          try {
            if (typeof possiblePath === 'function') {
              executablePath = possiblePath()
              break
            } else {
              await fs.access(possiblePath)
              executablePath = possiblePath
              break
            }
          } catch {
            continue
          }
        }

        if (!executablePath) {
          throw new Error('No suitable browser found for Puppeteer')
        }
      }
    } catch (error) {
      console.warn('Failed to get Puppeteer executable path:', error)
      throw error
    }

    const isProduction = process.env.NODE_ENV === 'production'

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
