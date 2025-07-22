// used for rendering equations (optional)
import 'katex/dist/katex.min.css'
// core styles shared by all of react-notion-x (required)
import 'react-notion-x/src/styles.css'
// global styles shared across the entire site
import '../styles/global.css'
// this might be better for dark mode
// import 'prismjs/themes/prism-okaidia.css'
// global style overrides for notion
import '../styles/notion.css'
// global style overrides for prism theme (optional)
import '../styles/prism-theme.css'
import '../styles/glass-theme.css'

import type { AppProps } from 'next/app'
import * as Fathom from 'fathom-client'
import { useRouter } from 'next/router'
import { posthog } from 'posthog-js'
import * as React from 'react'

import type * as types from '@/lib/types'
import Background from '@/components/Background'
import { Footer } from '@/components/Footer'
import { SideNav } from '@/components/SideNav'
import { TopNav } from '@/components/TopNav'
import { bootstrap } from '@/lib/bootstrap-client'
import {
  fathomConfig,
  fathomId,
  posthogConfig,
  posthogId
} from '@/lib/config'
import { mapImageUrl } from '@/lib/map-image-url'

if (typeof window !== 'undefined') {
  bootstrap()
}

export default function App({ Component, pageProps }: AppProps<types.PageProps>) {
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [scrollProgress, setScrollProgress] = React.useState(0)
  const [backgroundAsset, setBackgroundAsset] = React.useState<{ type: 'image' | 'video'; src: string } | null>(null)
  const [isHeroPaused, setIsHeroPaused] = React.useState(false)

  const handleScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    if (scrollHeight - clientHeight === 0) {
      setScrollProgress(0)
      return
    }
    const progress = scrollTop / (scrollHeight - clientHeight)
    setScrollProgress(progress)
  }, [])

  // Detect mobile screen size
  React.useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 1024 // 1024px breakpoint
      console.log('DEBUG: Screen width:', window.innerWidth, 'isMobile:', mobile)
      setIsMobile(mobile)
      // If switching to mobile, close the menu
      if (mobile) {
        setIsMobileMenuOpen(false)
        console.log('DEBUG: Switched to mobile, closing menu')
      }
    }

    setMounted(true)
    console.log('DEBUG: Component mounted')
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)

    return () => {
      window.removeEventListener('resize', checkIsMobile)
    }
  }, [])

  // Close mobile menu when route changes
  React.useEffect(() => {
    const handleRouteChange = () => {
      setIsMobileMenuOpen(false)
      console.log('DEBUG: Route changed, closing mobile menu')
    }

    router.events.on('routeChangeStart', handleRouteChange)
    return () => {
      router.events.off('routeChangeStart', handleRouteChange)
    }
  }, [router.events])

  // Debug mobile state changes
  React.useEffect(() => {
    console.log('DEBUG: Mobile state changed - isMobile:', isMobile, 'isMobileMenuOpen:', isMobileMenuOpen, 'mounted:', mounted)
  }, [isMobile, isMobileMenuOpen, mounted])

  React.useEffect(() => {
    function onRouteChangeComplete() {
      if (fathomId) {
        Fathom.trackPageview()
      }

      if (posthogId) {
        posthog.capture('$pageview')
      }
    }

    if (fathomId) {
      Fathom.load(fathomId, fathomConfig)
    }

    if (posthogId) {
      posthog.init(posthogId, posthogConfig)
    }

    router.events.on('routeChangeComplete', onRouteChangeComplete)

    return () => {
      router.events.off('routeChangeComplete', onRouteChangeComplete)
    }
  }, [router.events])

  // Extract siteMap and recordMap for the SideNav component
  const { siteMap, recordMap, pageId } = pageProps

  // Get the page cover image from the Notion data
  const pageBlockForCover = pageId ? recordMap?.block?.[pageId]?.value : undefined
  const pageCover = pageBlockForCover?.format?.page_cover
  const notionImageUrl = pageBlockForCover ? mapImageUrl(pageCover, pageBlockForCover) : undefined


  // Get page info to determine layout style
  const pageInfo = siteMap && pageId ? siteMap.pageInfoMap[pageId] : null

  const isCategory = pageInfo?.type === 'Category'

  // Calculate TOC display in real-time for applying container padding
  const [screenWidth, setScreenWidth] = React.useState(0)

  React.useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth)
    }
    // Set initial screen width
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const showTOC = React.useMemo(() => {
    if (!pageInfo || !recordMap) return false

    const isBlogPost = pageInfo.type === 'Post'

    if (!isBlogPost) return false

    let headerCount = 0
    for (const blockWrapper of Object.values(recordMap.block)) {
      const blockData = (blockWrapper as any)?.value
      if (blockData?.type === 'header' || blockData?.type === 'sub_header' || blockData?.type === 'sub_sub_header') {
        headerCount++
      }
    }

    const minTableOfContentsItems = 3
    // Also check screen width
    return headerCount >= minTableOfContentsItems && !isMobile && screenWidth >= 1300
  }, [pageInfo, recordMap, isMobile, screenWidth])


  
  // Adjust position of Notion Page
  const paddingRight = showTOC ? '34rem' : '0'


  const toggleMobileMenu = React.useCallback(() => {
    console.log('DEBUG: Toggle mobile menu called - current state:', isMobileMenuOpen, '-> new state:', !isMobileMenuOpen)
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }, [isMobileMenuOpen])

  const closeMobileMenu = React.useCallback(() => {
    console.log('DEBUG: Close mobile menu called')
    setIsMobileMenuOpen(false)
  }, [])

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    console.log('DEBUG: Not mounted yet, rendering basic layout')
    return (
      <div style={{ 
        display: 'flex', 
        height: '100vh',
        overflow: 'hidden'
      }}>
        {/* Render basic layout without side nav during SSR */}
        <main style={{ 
          flex: 1, 
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden'
        }}>
          <Component {...pageProps} isMobile={isMobile} setBackgroundAsset={setBackgroundAsset} isHeroPaused={isHeroPaused} setIsHeroPaused={setIsHeroPaused} />
        </main>
      </div>
    )
  }

  console.log('DEBUG: Rendering main layout - isMobile:', isMobile, 'isMobileMenuOpen:', isMobileMenuOpen)

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden'
      }}
    >
      <Background
        imageUrl={
          router.pathname === '/' && backgroundAsset?.type === 'image'
            ? backgroundAsset.src
            : notionImageUrl
        }
        videoUrl={
          router.pathname === '/' && backgroundAsset?.type === 'video'
            ? backgroundAsset.src
            : undefined
        }
        scrollProgress={scrollProgress}
        isPaused={isHeroPaused}
      />

      {/* Mobile Menu Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)', // Safari support
            zIndex: 999,
            transition: 'all 0.3s ease'
          }}
          onClick={closeMobileMenu}
        />
      )}

      {/* Render our SideNav component when siteMap is available */}
      {siteMap && (
        <SideNav
          siteMap={siteMap}
          isMobile={isMobile}
          isMobileMenuOpen={isMobileMenuOpen}
        />
      )}

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          position: 'relative' /* Set position context for TopNav */
        }}
      >
        {/* TopNav is now positioned absolutely within this main container */}
        {siteMap && pageProps.pageId && (
          <TopNav
            pageProps={pageProps}
            isMobile={isMobile}
            onToggleMobileMenu={toggleMobileMenu}
          />
        )}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflow: 'auto',
            paddingTop: '88px', /* Add padding to prevent content overlap */
            paddingRight
          }}
        >
          <div
            className='glass-content-panel'
            style={{
              display: isCategory ? 'flex' : 'block',
              justifyContent:
                isCategory && (pageInfo as any)?.postsCount === 0
                  ? 'stretch'
                  : 'center'
            }}
          >
            <Component
              {...pageProps}
              isMobile={isMobile}
              showTOC={showTOC}
              setBackgroundAsset={setBackgroundAsset}
              isHeroPaused={isHeroPaused}
              setIsHeroPaused={setIsHeroPaused}
            />
          </div>
          <Footer />
        </div>
      </main>
    </div>
  )
}