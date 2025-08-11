import fs from 'node:fs/promises'
import path from 'node:path'
import { getSupportedBackgroundFormats, getDefaultBackgroundUrl } from './get-default-background'

export const detectBestBackgroundFormatOnServer = async (): Promise<string> => {
  const supportedFormats = getSupportedBackgroundFormats()
  const publicDir = path.join(process.cwd(), 'public')

  for (const format of supportedFormats) {
    const imagePath = path.join(publicDir, `default_background.${format}`)
    const imageUrl = `/default_background.${format}`
    try {
      await fs.access(imagePath)
      // File exists, return this URL
      return imageUrl
    } catch {
      // File doesn't exist, continue to the next format
    }
  }

  // Fallback if no format is found
  return getDefaultBackgroundUrl()
}
