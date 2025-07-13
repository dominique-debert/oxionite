import React, { useEffect, useRef } from 'react'
import { useDarkMode } from '@/lib/use-dark-mode'

interface BackgroundProps {
  imageUrl?: string
  videoUrl?: string
}

// A component that renders a blurred, infinitely scrolling background.
// It uses four copies of the same image/video, with every second one flipped
// to create a seamless, mirrored, and truly infinite effect.
const Background: React.FC<BackgroundProps> = ({ imageUrl, videoUrl }) => {
  const { isDarkMode } = useDarkMode()
  const backgroundSource = imageUrl || '/default_background.webp'
  const translateY = useRef(0)
  const backgroundRef = useRef<HTMLDivElement>(null)

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
            ? 'rgba(0, 0, 0, 0.4)'
            : 'rgba(255, 255, 255, 0.4)',
          transition: 'background-color 0.2s ease'
        }}
      />
    </div>
  )
}

export default Background