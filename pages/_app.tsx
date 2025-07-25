import 'katex/dist/katex.min.css'
import 'react-notion-x/src/styles.css'
import 'styles/glass-theme.css'
import 'styles/global.css'
import 'styles/notion.css'
import 'styles/prism-theme.css'

import type { AppProps } from 'next/app'
import cs from 'classnames'
import * as Fathom from 'fathom-client'
import { useRouter } from 'next/router'
import { posthog } from 'posthog-js'
import * as React from 'react'
import styles from 'styles/components/common.module.css'

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
  const [scrollProgress, setScrollProgress] = React.useState(0)
  const [backgroundAsset, setBackgroundAsset] = React.useState<HTMLImageElement | HTMLVideoElement | string | null>(null)
  const [isHeroPaused, setIsHeroPaused] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement
      if (scrollHeight - clientHeight === 0) {
        setScrollProgress(0)
        return
      }
      const progress = scrollTop / (scrollHeight - clientHeight)
      setScrollProgress(progress)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  React.useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (mobile) {
        setIsMobileMenuOpen(false)
      }
    }
    setMounted(true)
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => {
      window.removeEventListener('resize', checkIsMobile)
    }
  }, [])

  React.useEffect(() => {
    const handleRouteChange = () => {
      setIsMobileMenuOpen(false)
    }
    router.events.on('routeChangeStart', handleRouteChange)
    return () => {
      router.events.off('routeChangeStart', handleRouteChange)
    }
  }, [router.events])

  React.useEffect(() => {
    function onRouteChangeComplete() {
      if (fathomId) Fathom.trackPageview()
      if (posthogId) posthog.capture('$pageview')
    }
    if (fathomId) Fathom.load(fathomId, fathomConfig)
    if (posthogId) posthog.init(posthogId, posthogConfig)
    router.events.on('routeChangeComplete', onRouteChangeComplete)
    return () => {
      router.events.off('routeChangeComplete', onRouteChangeComplete)
    }
  }, [router.events])

  React.useEffect(() => {
    if (mounted) {
      if (isMobile) {
        document.body.classList.add('mboidle')
      } else {
        document.body.classList.remove('mboidle')
      }
    }
  }, [isMobile, mounted])

  const { siteMap, recordMap, pageId } = pageProps
  const pageBlockForCover = pageId ? recordMap?.block?.[pageId]?.value : undefined
  const pageCover = pageBlockForCover?.format?.page_cover
  const notionImageUrl = pageBlockForCover ? mapImageUrl(pageCover, pageBlockForCover) : undefined
  const pageInfo = siteMap && pageId ? siteMap.pageInfoMap[pageId] : null

  const [screenWidth, setScreenWidth] = React.useState(0)
  React.useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth)
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
    return headerCount >= minTableOfContentsItems && !isMobile && screenWidth >= 1300
  }, [pageInfo, recordMap, isMobile, screenWidth])

  const paddingRight = showTOC ? '34rem' : '0'

  const toggleMobileMenu = React.useCallback(() => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }, [isMobileMenuOpen])

  const closeMobileMenu = React.useCallback(() => {
    setIsMobileMenuOpen(false)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <>
      <Background
        source={router.pathname === '/' ? backgroundAsset : notionImageUrl || null}
        scrollProgress={scrollProgress}
      />

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
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 1002
          }}
          onClick={closeMobileMenu}
        />
      )}

      {/* Layer 1: Fixed elements that are independent of scroll */}
      {siteMap && (
        <SideNav
          siteMap={siteMap}
          isMobile={isMobile}
          isMobileMenuOpen={isMobileMenuOpen}
        />
      )}
      {siteMap && pageProps.pageId && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            left: !isMobile ? 'calc(var(--sidenav-width) + 32px)' : 0,
            right: 0,
            zIndex: 1000
          }}
        >
          <TopNav
            pageProps={pageProps}
            isMobile={isMobile}
            onToggleMobileMenu={toggleMobileMenu}
          />
        </div>
      )}

      {/* Layer 2: The main content container, which handles layout and scrolling */}
      <div
        className={cs(!isMobile && styles.contentWithSideNav)}
        style={{
          '--main-content-margin-left': !isMobile ? 'calc(var(--sidenav-width) + 32px)' : '0px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          paddingTop: '88px'
        }}
      >
        <main
          style={{
            flex: '1 0 auto'
          }}
        >
          <div style={{ paddingRight }}>
            <div className='glass-content-panel'>
              <Component
                {...pageProps}
                isMobile={isMobile}
                showTOC={showTOC}
                setBackgroundAsset={setBackgroundAsset}
                isHeroPaused={isHeroPaused}
                setIsHeroPaused={setIsHeroPaused}
              />
            </div>
          </div>
        </main>

        <Footer isMobile={isMobile} />
      </div>
    </>
  )
}
