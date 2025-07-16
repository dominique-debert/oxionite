import React, { useEffect, useRef, useState } from 'react'
import { useDarkMode } from '@/lib/use-dark-mode'

// --- Configuration ---
// Adjust these values to control the overlay opacity range.

// In Dark Mode, how much should the black overlay appear based on the background's brightness?
// min: Opacity for the darkest backgrounds (luminance: 0)
// max: Opacity for the brightest backgrounds (luminance: 255)
const DARK_MODE_OPACITY_RANGE = { min: 0.2, max: 0.9 }

// In Light Mode, how much should the white overlay appear based on the background's darkness?
// min: Opacity for the brightest backgrounds (luminance: 255)
// max: Opacity for the darkest backgrounds (luminance: 0)
const LIGHT_MODE_OPACITY_RANGE = { min: 0.2, max: 0.7 }

// How much to zoom the background. 1.5 means 150% zoom.
const BACKGROUND_ZOOM = 1.5

// Defines the visible portion of the background image during scroll.
// 0.0 is the very top, 1.0 is the very bottom.
// To avoid blurred edges, we can restrict this range, e.g., from 0.1 to 0.9.
const BACKGROUND_VISIBLE_START = 0.25 // Start scrolling from 10% down the image
const BACKGROUND_VISIBLE_END = 0.75   // End scrolling at 90% down the image

// Helper to map a value from one range to another
const mapRange = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number => {
  const result =
    ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
  const B = Math.max(outMin, outMax)
  const A = Math.min(outMin, outMax)
  return Math.max(Math.min(result, B), A)
}

// Gets the average luminance of an image by sampling it
const getAverageLuminance = (imgSrc: string): Promise<number> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = imgSrc
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        return resolve(128) // Fallback to medium gray
      }
      canvas.width = 1
      canvas.height = 1
      ctx.drawImage(img, 0, 0, 1, 1)

      const imageData = ctx.getImageData(0, 0, 1, 1).data
      if (imageData && imageData.length >= 3) {
        const [r, g, b] = imageData
        // The `possibly 'undefined'` error suggests a strict tsconfig setting (`noUncheckedIndexedAccess`).
        // Adding an explicit check to assure the compiler that these values are numbers.
        if (typeof r === 'number' && typeof g === 'number' && typeof b === 'number') {
          const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
          resolve(luminance)
        } else {
          // This should be unreachable, but it acts as a safeguard.
          resolve(128)
        }
      } else {
        resolve(128) // Fallback on error
      }
    }
    img.onerror = () => {
      console.error(`Failed to load image: ${imgSrc}`)
      resolve(128) // Medium gray on error
    }
  })
}

interface BackgroundProps {
  imageUrl?: string
  videoUrl?: string
  scrollProgress?: number
}

// A component that renders a blurred, scrolling background.
const Background: React.FC<BackgroundProps> = ({ imageUrl, videoUrl, scrollProgress = 0 }) => {
  const { isDarkMode } = useDarkMode()
  const [overlayOpacity, setOverlayOpacity] = useState(0.4)
  const backgroundSource = imageUrl || '/default_background.webp'
  const backgroundRef = useRef<HTMLDivElement | HTMLVideoElement>(null)

  useEffect(() => {
    if (videoUrl) {
      setOverlayOpacity(0.4)
      return
    }

    let isMounted = true

    const calculateAndSetOpacity = async () => {
      const luminance = await getAverageLuminance(backgroundSource)
      if (!isMounted) return

      let newOpacity: number
      if (isDarkMode) {
        newOpacity = mapRange(
          luminance, 0, 255,
          DARK_MODE_OPACITY_RANGE.min, DARK_MODE_OPACITY_RANGE.max
        )
      } else {
        newOpacity = mapRange(
          luminance, 0, 255,
          LIGHT_MODE_OPACITY_RANGE.max, LIGHT_MODE_OPACITY_RANGE.min
        )
      }
      setOverlayOpacity(newOpacity)
    }

    calculateAndSetOpacity()

    return () => { isMounted = false }
  }, [backgroundSource, isDarkMode, videoUrl])

  useEffect(() => {
    if (backgroundRef.current) {
      const vh = window.innerHeight
      const movableDistance = vh * (BACKGROUND_ZOOM - 1)

      // The full potential translation range for the background
      const fullRangeTop = movableDistance / 2
      const fullRangeBottom = -movableDistance / 2

      // Calculate the actual start and end points based on the visible range constants
      const startTranslateY = fullRangeTop + (fullRangeBottom - fullRangeTop) * BACKGROUND_VISIBLE_START
      const endTranslateY = fullRangeTop + (fullRangeBottom - fullRangeTop) * BACKGROUND_VISIBLE_END

      // Map the scroll progress to the new restricted translation range
      const newTranslateY = startTranslateY + scrollProgress * (endTranslateY - startTranslateY)

      backgroundRef.current.style.transform = `scale(${BACKGROUND_ZOOM}) translateY(${newTranslateY}px)`
    }
  }, [scrollProgress])

  const backgroundStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100vh',
    objectFit: 'cover',
    filter: 'blur(40px)',
    transition: 'transform 0.3s ease-out'
  }

  return (
    <div
      style={{
        position: 'fixed',
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        overflow: 'hidden'
      }}
    >
      {videoUrl ? (
        <video
          ref={backgroundRef as React.RefObject<HTMLVideoElement>}
          autoPlay
          loop
          muted
          playsInline
          src={videoUrl}
          style={backgroundStyle}
        />
      ) : (
        <div
          ref={backgroundRef as React.RefObject<HTMLDivElement>}
          style={{
            ...backgroundStyle,
            backgroundImage: `url(${backgroundSource})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}
      {/* The dark/light mode overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isDarkMode
            ? `rgba(0, 0, 0, ${overlayOpacity})`
            : `rgba(255, 255, 255, ${overlayOpacity})`,
          transition: 'background-color 0.5s ease'
        }}
      />
    </div>
  )
}

export default Background