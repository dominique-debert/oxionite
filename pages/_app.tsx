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

import type * as types from '@/lib/context/types'
import Background from '@/components/Background'
import { Footer } from '@/components/Footer'

import { GraphController } from '@/components/debug/GraphController'
import { SocialImagePreviewer } from '@/components/debug/SocialImagePreviewer'
import { SideNav } from '@/components/SideNav'
import { TopNav } from '@/components/TopNav'
import { bootstrap } from '@/lib/bootstrap-client'
import {
  fathomConfig,
  fathomId,
  posthogConfig,
  posthogId,
} from '@/lib/config'
import { mapImageUrl } from '@/lib/map-image-url'
import { AppContext } from '@/lib/context/app-context'
import { Noto_Sans_KR } from 'next/font/google'
import { appWithTranslation } from 'next-i18next'
import { getBlockTitle } from 'notion-utils'
import { PageHead } from '@/components/PageHead'

const SHOW_DEBUG_CONTROLS = true
const SHOW_DEBUG_SOCIAL_IMAGE = true

const notoKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700', '900'],
  variable: '--font-noto-sans-kr'
})

if (typeof window !== 'undefined') {
  bootstrap()
}

function App({ Component, pageProps }: AppProps<types.PageProps>) {
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)
  const [showDesktopSideNav, setShowDesktopSideNav] = React.useState(false)
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
    const checkShowSideNav = () => {
      setShowDesktopSideNav(window.innerWidth >= 1500)
    }

    checkIsMobile()
    checkShowSideNav()

    const handleResize = () => {
      checkIsMobile()
      checkShowSideNav()
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
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
  
  // Check for category page cover image from pageInfo
  const pageInfo = siteMap && pageId ? siteMap.pageInfoMap[pageId] : null
  const categoryCoverImage = pageInfo?.coverImage
  
  // Use category cover image if available, otherwise use recordMap cover
  const notionImageUrl = categoryCoverImage || (pageBlockForCover ? mapImageUrl(pageCover, pageBlockForCover) : undefined)

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
    return headerCount >= minTableOfContentsItems && !isMobile && screenWidth >= 1200
  }, [pageInfo, recordMap, isMobile, screenWidth])

  const paddingRight = showTOC ? '32rem' : '0'

  const closeMobileMenu = React.useCallback(() => {
    setIsMobileMenuOpen(false)
  }, [])

  if (!mounted) {
    return null
  }

  // Check if this is a 404 page
  const is404Page = router.pathname === '/404';

  if (!siteMap && !is404Page) {
    return <Component {...pageProps} />
  }

  const appContextValue = {
    siteMap,
    pageInfo
  }

  // Determine page title based on route
  const getPageTitle = () => {
    const { pathname, query } = router;
    
    if (pathname === '/') {
      return pageProps.site?.name || '';
    }
    
    if (pathname === '/post/[...slug]') {
      const block = pageProps.pageId && pageProps.recordMap?.block?.[pageProps.pageId]?.value;
      return (block && pageProps.recordMap) ? getBlockTitle(block, pageProps.recordMap) : pageProps.site?.name || '';
    }
    
    if (pathname === '/category/[slug]') {
      const block = pageProps.pageId && pageProps.recordMap?.block?.[pageProps.pageId]?.value;
      return (block && pageProps.recordMap) ? getBlockTitle(block, pageProps.recordMap) : pageProps.site?.name || '';
    }
    
    if (pathname === '/tag/[tag]') {
      return `${query.tag}`;
    }
    
    if (pathname === '/all-tags') {
      return '모든 태그';
    }
    
    if (pathname === '/404') {
      return `404 - ${pageProps.site?.name || ''}`;
    }
    
    return pageProps.site?.name || '';
  };

  const pageTitle = getPageTitle();

  return (
    <AppContext.Provider value={appContextValue}>
      <PageHead
        site={pageProps.site}
        title={pageTitle}
        pageId={pageProps.pageId}
      />
      {SHOW_DEBUG_CONTROLS && <GraphController />}
      {SHOW_DEBUG_SOCIAL_IMAGE && <SocialImagePreviewer />}
      <style jsx global>{`
        :root {
          --font-noto-sans-kr: ${notoKR.style.fontFamily};
        }
      `}</style>

      {/* Mobile menu overlay */}
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

      <div className={notoKR.variable}>
        <div id="modal-root"></div>
        <Background
          source={router.pathname === '/' ? backgroundAsset : notionImageUrl || null}
          scrollProgress={scrollProgress}
        />

        {/* Layer 1: Fixed elements that are independent of scroll */}
        {(siteMap || is404Page) && (
          <SideNav
            siteMap={siteMap}
            isCollapsed={!showDesktopSideNav}
            isMobileMenuOpen={isMobileMenuOpen}
          />
        )}
        {(siteMap || is404Page) && (
          <div
            style={{
              position: 'fixed',
              top: 16,
              left: showDesktopSideNav && siteMap ? 'calc(var(--sidenav-width) + 32px)' : 0,
              right: 0,
              zIndex: 1000
            }}
          >
            <TopNav
              pageProps={pageProps}
              isMobile={isMobile}
              isSideNavCollapsed={!showDesktopSideNav}
              onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </div>
        )}

        {/* Layer 2: The main content container, which handles layout and scrolling */}
        <div
          className={cs(showDesktopSideNav && styles.contentWithSideNav)}
          style={{
            '--main-content-margin-left': showDesktopSideNav ? 'calc(var(--sidenav-width) + 32px)' : '0px',
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
      </div>
    </AppContext.Provider>
  )
}

export default appWithTranslation(App)
