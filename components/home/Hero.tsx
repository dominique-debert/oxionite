import Image from 'next/image'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import siteConfig from 'site.config'
import styles from 'styles/components/home.module.css'

const IMAGE_DURATION = 3000 // 3 seconds

interface HeroAsset {
  type: 'image' | 'video'
  src: string
  title?: string
  description?: string
}

interface HeroProps {
  onAssetChange: (asset: HeroAsset | null) => void
  isPaused: boolean
  setIsPaused: (isPaused: boolean) => void
}

export default function Hero({ onAssetChange, isPaused, setIsPaused }: HeroProps) {
  const [isVisuallyPaused, setIsVisuallyPaused] = useState(false)
  const [isHeld, setIsHeld] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const pauseStartTimeRef = useRef<number>(0)
  const totalPauseDurationRef = useRef<number>(0)
  const pointerDownTimeRef = useRef<number>(0)
  const pointerStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const heroRef = useRef<HTMLDivElement>(null)

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
    setIsPaused(isVisuallyPaused || isHeld)
  }, [isVisuallyPaused, isHeld, setIsPaused])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry) {
          setIsVisuallyPaused(!entry.isIntersecting)
        }
      },
      { threshold: 0.1 } // Trigger when 10% of the hero is visible
    )

    const currentHeroRef = heroRef.current
    if (currentHeroRef) {
      observer.observe(currentHeroRef)
    }

    return () => {
      if (currentHeroRef) {
        observer.unobserve(currentHeroRef)
      }
    }
  }, [])

  // --- PROBLEM AREA START ---
  // This effect should ONLY run when the asset (currentIndex) changes.
  // It sets up the animation for the NEW asset.
  // It should NOT re-run when isPaused changes.
  useEffect(() => {
    if (!heroAssets || heroAssets.length === 0) {
      onAssetChange(null)
      return
    }

    onAssetChange(heroAssets[currentIndex] || null)
    // Reset all timing and progress for the new slide
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
      // If paused (by hold or visibility), just loop without updating progress.
      // The pause duration is calculated in the `isPaused` effect.
      if (pauseStartTimeRef.current > 0) {
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
      
      // Mark the start time on the very first frame of a new animation
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
        // Only start playing if not paused from the beginning
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
  // ❗️ FIX: Removed `isPaused` from the dependency array.
  // Now this effect only re-runs when the slide changes.
  }, [currentIndex, heroAssets, onAssetChange, goToNext]) 
  // --- PROBLEM AREA END ---

  // This effect correctly handles the PAUSE/RESUME logic
  // by manipulating the timing refs without resetting the animation.
  useEffect(() => {
    const asset = heroAssets?.[currentIndex]
    if (!asset) return

    if (isPaused) {
      // If we are not already in a paused state, record the time.
      if (pauseStartTimeRef.current === 0) { 
        pauseStartTimeRef.current = performance.now()
        if (asset.type === 'video' && videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause()
        }
      }
    } else { // Resuming
      // If we are resuming from a paused state...
      if (pauseStartTimeRef.current > 0) {
        // ...add the duration of the just-ended pause to the total.
        totalPauseDurationRef.current += performance.now() - pauseStartTimeRef.current
        // Reset the pause start time.
        pauseStartTimeRef.current = 0
        if (asset.type === 'video' && videoRef.current && videoRef.current.paused) {
          videoRef.current.play().catch(err => console.error("Hero video play failed:", err))
        }
      }
    }
  }, [isPaused, currentIndex, heroAssets])

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only respond to main button (e.g., left-click)
    if (e.button !== 0) return;
    pointerDownTimeRef.current = Date.now()
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY }
    setIsHeld(true)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    // Only respond to main button
    if (e.button !== 0) return;
    const pressDuration = Date.now() - pointerDownTimeRef.current
    const startPos = pointerStartPosRef.current
    const endPos = { x: e.clientX, y: e.clientY }
    
    let movedDistance = 0
    if (startPos) {
      const deltaX = endPos.x - startPos.x
      const deltaY = endPos.y - startPos.y
      movedDistance = Math.hypot(deltaX, deltaY)
    }

    // It's a click, not a hold or scroll.
    if (pressDuration < 200 && movedDistance < 20) {
      const { clientX, currentTarget } = e
      const { left, width } = currentTarget.getBoundingClientRect()
      const clickPosition = (clientX - left) / width

      if (clickPosition < 0.5) {
        goToPrevious()
      } else {
        goToNext()
      }
    }

    // Always end the hold on pointer up, this will resume playback if it was a hold.
    setIsHeld(false)
  }

  const handlePointerLeave = useCallback(() => {
    setIsHeld(false)
  }, [])

  if (!heroAssets || heroAssets.length === 0) {
    return null
  }
  const currentAsset = heroAssets[currentIndex]
  if (!currentAsset) return null

  return (
    <div
      className={styles.heroContainer}
      ref={heroRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onContextMenu={(e) => e.preventDefault()}
      style={{ touchAction: 'pan-y' }} // Allow vertical scroll on mobile
    >
      <div className={styles.heroTopShadow} />
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
                fill
                style={{ objectFit: 'cover' }}
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