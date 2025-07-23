import React, { useCallback, useEffect, useRef, useState } from 'react'
import siteConfig from 'site.config'
import styles from 'styles/components/home.module.css'

const IMAGE_DURATION = 3000 // 3 seconds



interface HeroProps {
  onAssetChange: (asset: HTMLImageElement | HTMLVideoElement | null) => void
  isPaused: boolean
  setIsPaused: (isPaused: boolean) => void
}

export default function Hero({ onAssetChange, isPaused, setIsPaused }: HeroProps) {
  const [isVisuallyPaused, setIsVisuallyPaused] = useState(false)
  const [isHeld, setIsHeld] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
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

  // This effect runs when the slide changes to manage animations and report the active element.
  useEffect(() => {
    if (!heroAssets || heroAssets.length === 0) {
      onAssetChange(null)
      return
    }

    const asset = heroAssets[currentIndex]
    if (!asset) {
      onAssetChange(null)
      return
    }

    // Pass the active DOM element up to the parent.
    // This runs after the render pass, so the refs should be correctly set.
    if (asset.type === 'video') {
      onAssetChange(videoRef.current)
    } else {
      onAssetChange(imageRef.current)
    }

    // Reset all timing and progress for the new slide
    setProgress(0)
    startTimeRef.current = 0
    totalPauseDurationRef.current = 0
    pauseStartTimeRef.current = 0

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    const video = videoRef.current

    const animate = () => {
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

    if (asset.type === 'video' && video) {
      video.currentTime = 0
      const onCanPlay = () => {
        if (!isPaused) {
          video.play().catch(err => console.error("Hero video play failed:", err))
        }
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
  }, [currentIndex, heroAssets, onAssetChange, goToNext, isPaused])

  // This effect correctly handles the PAUSE/RESUME logic
  useEffect(() => {
    const asset = heroAssets?.[currentIndex]
    if (!asset) return

    if (isPaused) {
      if (pauseStartTimeRef.current === 0) { 
        pauseStartTimeRef.current = performance.now()
        if (asset.type === 'video' && videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause()
        }
      }
    } else { // Resuming
      if (pauseStartTimeRef.current > 0) {
        totalPauseDurationRef.current += performance.now() - pauseStartTimeRef.current
        pauseStartTimeRef.current = 0
        if (asset.type === 'video' && videoRef.current && videoRef.current.paused) {
          videoRef.current.play().catch(err => console.error("Hero video play failed:", err))
        }
      }
    }
  }, [isPaused, currentIndex, heroAssets, videoRef])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    pointerDownTimeRef.current = Date.now()
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY }
    setIsHeld(true)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
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
                autoPlay
                preload="auto"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={index === currentIndex ? imageRef : null}
                className={styles.heroMedia}
                src={asset.src}
                alt={asset.title || 'Hero Image'}
                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                loading={index === 0 ? 'eager' : 'lazy'}
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
