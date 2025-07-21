import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import type { Site } from '@/lib/types'
import siteConfig from 'site.config'
import styles from 'styles/pages/home.module.css'

const IMAGE_DURATION = 3000 // 3 seconds

interface HeroAsset {
  type: 'image' | 'video'
  src: string
  title?: string
  description?: string
}

interface HeroProps {
  site: Site
  isMobile: boolean
  onAssetChange: (asset: HeroAsset | null) => void
  isPaused: boolean
  setIsPaused: (isPaused: boolean) => void
}

const Hero: React.FC<HeroProps> = ({ site, isMobile, onAssetChange, isPaused, setIsPaused }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)


  const videoRef = useRef<HTMLVideoElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const pauseStartTimeRef = useRef<number>(0)
  const totalPauseDurationRef = useRef<number>(0)
  const pointerDownTimeRef = useRef<number>(0)

  const { heroAssets } = siteConfig

  const goToNext = useCallback(() => {
    setProgress(0) // Reset progress immediately
    setCurrentIndex(prev => (prev + 1) % (heroAssets?.length || 1))
  }, [heroAssets])

  const goToPrevious = useCallback(() => {
    setProgress(0) // Reset progress immediately
    setCurrentIndex(prev => (prev - 1 + (heroAssets?.length || 1)) % (heroAssets?.length || 1))
  }, [heroAssets])

  useEffect(() => {
    if (!heroAssets || heroAssets.length === 0) {
      onAssetChange(null)
      return
    }

    onAssetChange(heroAssets[currentIndex] || null)
    setProgress(0)
    startTimeRef.current = 0
    totalPauseDurationRef.current = 0
    pauseStartTimeRef.current = 0

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    const asset = heroAssets[currentIndex]
    if (!asset) return

    const video = videoRef.current

    const animate = () => {
      if (pauseStartTimeRef.current > 0) {
        // If we are paused, simply request the next frame and do nothing.
        animationFrameRef.current = requestAnimationFrame(animate)
        return
      }

      const duration = asset.type === 'video' 
        ? (video?.duration || 0) * 1000 
        : IMAGE_DURATION

      if (duration === 0) {
        animationFrameRef.current = requestAnimationFrame(animate)
        return
      }

      if (startTimeRef.current === 0) {
        startTimeRef.current = performance.now()
      }

      const elapsedTime = performance.now() - startTimeRef.current - totalPauseDurationRef.current
      const currentProgress = Math.min(elapsedTime / duration, 1)
      setProgress(currentProgress)

      if (currentProgress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        goToNext()
      }
    }

    // Start the animation loop
    if (asset.type === 'video' && video) {
      video.currentTime = 0
      const onCanPlay = () => {
        if (!isPaused) video.play().catch(err => console.error("Hero video play failed:", err))
        animationFrameRef.current = requestAnimationFrame(animate)
      }
      if (video.readyState >= video.HAVE_ENOUGH_DATA) {
        onCanPlay()
      } else {
        video.addEventListener('canplaythrough', onCanPlay, { once: true })
      }
    } else {
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [currentIndex, heroAssets, onAssetChange, goToNext])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isPaused) {
      video.pause()
      pauseStartTimeRef.current = performance.now()
    } else {
      if (pauseStartTimeRef.current > 0) {
        totalPauseDurationRef.current += performance.now() - pauseStartTimeRef.current
        pauseStartTimeRef.current = 0
      }
      video.play().catch(err => console.error("Hero video play failed:", err))
    }
  }, [isPaused])

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownTimeRef.current = Date.now()
    setIsPaused(true)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    const pressDuration = Date.now() - pointerDownTimeRef.current
    
    // Always resume playback after pointer up
    setIsPaused(false)

    if (pressDuration < 200) { // Click
      const { clientX, currentTarget } = e
      const { left, width } = currentTarget.getBoundingClientRect()
      const clickPosition = (clientX - left) / width

      if (clickPosition < 0.5) {
        goToPrevious()
      } else {
        goToNext()
      }
    }
    // For hold release, we just need to resume, which is already done by setIsPaused(false)
  }

  const handlePointerLeave = useCallback(() => {
    if (isPaused) {
      setIsPaused(false)
    }
  }, [isPaused])

  if (!heroAssets || heroAssets.length === 0) {
    return null
  }
  const currentAsset = heroAssets[currentIndex]
  if (!currentAsset) return null

  return (
    <div
      className={styles.heroContainer}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onContextMenu={(e) => e.preventDefault()}
      style={{ touchAction: 'none' }} // Prevents scrolling on mobile
    >
      <div className={styles.heroProgressContainer}>
        {heroAssets.map((_, index) => (
          <div key={index} className={styles.heroProgressBar}>
            <div
              className={styles.heroProgressIndicator}
              style={{
                transform: `scaleX(${index === currentIndex ? progress : index < currentIndex ? 1 : 0})`,
              }}
            />
          </div>
        ))}
      </div>

      <div className={styles.heroMediaWrapper}>
        {heroAssets.map((asset, index) => (
          <div
            key={asset.src}
            className={`${styles.heroMediaItem} ${index === currentIndex ? styles.active : ''}`}
          >
            {asset.type === 'video' ? (
              <video
                ref={index === currentIndex ? videoRef : null}
                className={styles.heroMedia}
                src={asset.src}
                playsInline
                muted
                preload="auto"
              />
            ) : (
              <Image
                className={styles.heroMedia}
                src={asset.src}
                alt={asset.title || 'Hero Image'}
                layout="fill"
                objectFit="cover"
                priority={index === 0}
              />
            )}
          </div>
        ))}
      </div>

      <div className={styles.heroOverlay}>
        <div className={styles.heroTextContainer}>
          <div className={styles.heroTextShadow} />
          {currentAsset.title && <h2 className={styles.heroTitle}>{currentAsset.title}</h2>}
          {currentAsset.description && <p className={styles.heroDescription}>{currentAsset.description}</p>}
        </div>
      </div>
    </div>
  )
}

export default Hero