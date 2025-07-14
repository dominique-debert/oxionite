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
}

// A component that renders a blurred, infinitely scrolling background.
// It uses four copies of the same image/video, with every second one flipped
// to create a seamless, mirrored, and truly infinite effect.
const Background: React.FC<BackgroundProps> = ({ imageUrl, videoUrl }) => {
  const { isDarkMode } = useDarkMode()
  const [overlayOpacity, setOverlayOpacity] = useState(0.4)
  const backgroundSource = imageUrl || '/default_background.webp'
  const translateY = useRef(0)
  const backgroundRef = useRef<HTMLDivElement>(null)

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
        // Dark Mode: Brighter background => more opaque black overlay
        newOpacity = mapRange(
          luminance,
          0,
          255,
          DARK_MODE_OPACITY_RANGE.min,
          DARK_MODE_OPACITY_RANGE.max
        )
      } else {
        // Light Mode: Darker background => more opaque white overlay
        newOpacity = mapRange(
          luminance,
          0,
          255,
          LIGHT_MODE_OPACITY_RANGE.max,
          LIGHT_MODE_OPACITY_RANGE.min
        )
      }
      setOverlayOpacity(newOpacity)
    }

    calculateAndSetOpacity()

    return () => {
      isMounted = false
    }
  }, [backgroundSource, isDarkMode, videoUrl])

  useEffect(() => {
    let animationFrameId: number

    const handleWheel = (event: WheelEvent) => {
      const scrollAmount = event.deltaY * 0.1
      translateY.current -= scrollAmount

      // Use rAF for smooth animations
      cancelAnimationFrame(animationFrameId)
      animationFrameId = requestAnimationFrame(() => {
        if (backgroundRef.current) {
          const vh = window.innerHeight
          // The repeating cycle is two elements (normal + flipped), which is 200vh.
          const cycleHeight = vh * 2

          // This logic creates a seamless loop.
          // When the scroll position goes past the end of the cycle (-cycleHeight),
          // it wraps around to the beginning (0).
          // This works because the element at -cycleHeight (the 3rd element) is identical
          // to the element at 0 (the 1st element).
          if (translateY.current <= -cycleHeight) {
            translateY.current %= cycleHeight
          }
          // Handle scrolling upwards
          else if (translateY.current > 0) {
            translateY.current = (translateY.current % cycleHeight) - cycleHeight
          }

          backgroundRef.current.style.transform = `translateY(${translateY.current}px)`
        }
      })
    }

    window.addEventListener('wheel', handleWheel, { passive: true })

    return () => {
      window.removeEventListener('wheel', handleWheel)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  const renderBackgroundElement = (key: number) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      left: 0,
      top: `${key * 100}vh`,
      width: '100%',
      height: '100vh',
      objectFit: 'cover',
      filter: 'blur(40px)',
      transform: 'scale(1.2)'
    }

    // Flip every second element (at index 1 and 3) for a mirrored effect
    if (key % 2 !== 0) {
      style.transform += ' scaleY(-1)'
    }

    if (videoUrl) {
      return (
        <video
          key={key}
          autoPlay
          loop
          muted
          playsInline
          src={videoUrl}
          style={style}
        />
      )
    } else {
      return (
        <div
          key={key}
          style={{
            ...style,
            backgroundImage: `url(${backgroundSource})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )
    }
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
      {/* The scrolling container now holds four elements */}
      <div
        ref={backgroundRef}
        style={{
          width: '100%',
          height: '400vh', // Height for four stacked elements
          position: 'relative'
        }}
      >
        {[0, 1, 2, 3].map(renderBackgroundElement)}
      </div>
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