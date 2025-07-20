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
}

const Hero: React.FC<HeroProps> = ({ site, isMobile, onAssetChange }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const pauseTimeRef = useRef<number>(0)
  const pointerDownTimeRef = useRef<number>(0)

  const { heroAssets } = siteConfig

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % (heroAssets?.length || 1))
  }, [heroAssets])

  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + (heroAssets?.length || 1)) % (heroAssets?.length || 1))
  }, [heroAssets])

  useEffect(() => {
    if (!heroAssets || heroAssets.length === 0) {
      onAssetChange(null)
      return
    }
    onAssetChange(heroAssets[currentIndex] || null)
    setProgress(0)
    pauseTimeRef.current = 0
    startTimeRef.current = performance.now()

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    const asset = heroAssets[currentIndex]
    if (!asset) return

    const duration = asset.type === 'video' 
      ? (videoRef.current?.duration || 0) * 1000 
      : IMAGE_DURATION

    const animate = (time: number) => {
      if (startTimeRef.current === 0) startTimeRef.current = time
      const elapsedTime = time - startTimeRef.current
      const currentProgress = Math.min(elapsedTime / duration, 1)
      setProgress(currentProgress)

      if (currentProgress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        goToNext()
      }
    }

    if (asset.type === 'video' && videoRef.current) {
      const video = videoRef.current
      const onCanPlay = () => {
        startTimeRef.current = performance.now()
        video.play()
        animationFrameRef.current = requestAnimationFrame(animate)
      }
      video.currentTime = 0
      if (video.readyState >= video.HAVE_FUTURE_DATA) {
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
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    if (isPaused) {
      pauseTimeRef.current = performance.now()
      video?.pause()
    } else {
      if (startTimeRef.current > 0 && pauseTimeRef.current > 0) {
        const pauseDuration = performance.now() - pauseTimeRef.current
        startTimeRef.current += pauseDuration
      }

      if (!heroAssets) return
      const asset = heroAssets[currentIndex]
      const duration = asset?.type === 'video' 
        ? (video?.duration || 0) * 1000 
        : IMAGE_DURATION

      const animate = (time: number) => {
        const elapsedTime = time - startTimeRef.current
        const currentProgress = Math.min(elapsedTime / duration, 1)
        setProgress(currentProgress)

        if (currentProgress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate)
        } else {
          goToNext()
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate)
      video?.play()
    }
  }, [isPaused, currentIndex, heroAssets, goToNext])


  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownTimeRef.current = Date.now()
    setIsPaused(true)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPaused) return

    const pressDuration = Date.now() - pointerDownTimeRef.current
    if (pressDuration < 200) { // Click
      const { clientX, currentTarget } = e
      const { left, width } = currentTarget.getBoundingClientRect()
      const clickPosition = (clientX - left) / width

      if (clickPosition < 0.5) {
        goToPrevious()
      } else {
        goToNext()
      }
      // After a click navigation, always resume playback
      setIsPaused(false)
    } else { // Hold release
      setIsPaused(false)
    }
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