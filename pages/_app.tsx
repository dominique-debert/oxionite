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
import { AppContext } from '@/lib/context/app-context'
import { Noto_Sans_KR } from 'next/font/google'
import { appWithTranslation } from 'next-i18next'
import { graphControl } from '@/components/graph/utils/graph-control'


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
    return headerCount >= minTableOfContentsItems && !isMobile && screenWidth >= 1200
  }, [pageInfo, recordMap, isMobile, screenWidth])

  const paddingRight = showTOC ? '32rem' : '0'


  const closeMobileMenu = React.useCallback(() => {
    setIsMobileMenuOpen(false)
  }, [])

  if (!mounted) {
    return null
  }

  // Debug controls for testing graph functionality
  const DebugControls = () => {
    const [slugInput, setSlugInput] = React.useState('');
    const [tagInput, setTagInput] = React.useState('');

    const handleSlugFocus = () => {
      if (slugInput.trim()) {
        const slugs = slugInput.split(',').map(s => s.trim()).filter(Boolean);
        console.log(`[Debug] Focusing on slugs:`, slugs);
        graphControl.changeViewAndFocusBySlug('post_view', slugs, 'sidenav');
      }
    };

    const handleTagFocus = () => {
      if (tagInput.trim()) {
        const tags = tagInput.split(',').map(s => s.trim()).filter(Boolean);
        console.log(`[Debug] Focusing on tags:`, tags);
        graphControl.changeViewAndFocusNode('tag_view', tags, 'sidenav');
      }
    };

    const handleSlugHighlight = () => {
      if (slugInput.trim()) {
        const slugs = slugInput.split(',').map(s => s.trim()).filter(Boolean);
        console.log(`[Debug] Highlighting slugs:`, slugs);
        graphControl.highlightBySlug(slugs, 'sidenav');
      }
    };

    const handleTagHighlight = () => {
      if (tagInput.trim()) {
        const tags = tagInput.split(',').map(s => s.trim()).filter(Boolean);
        console.log(`[Debug] Highlighting tags:`, tags);
        graphControl.highlightByTag(tags, 'sidenav');
      }
    };

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        fontSize: '12px',
        fontFamily: 'monospace',
        maxWidth: '300px'
      }}>
        <div><strong>Graph Debug Controls:</strong></div>
        
        <div style={{ marginTop: '8px' }}>
          <div>Basic Controls:</div>
          <button 
            onClick={() => graphControl.fitToHome('sidenav')}
            style={{ margin: '2px', padding: '2px 4px', fontSize: '10px' }}
          >
            Fit Home
          </button>
          <button 
            onClick={() => graphControl.changeView('post_view', 'sidenav')}
            style={{ margin: '2px', padding: '2px 4px', fontSize: '10px' }}
          >
            Post View
          </button>
          <button 
            onClick={() => graphControl.changeView('tag_view', 'sidenav')}
            style={{ margin: '2px', padding: '2px 4px', fontSize: '10px' }}
          >
            Tag View
          </button>
        </div>

        <div style={{ marginTop: '8px' }}>
          <div>Slug Input (Post/Category):</div>
          <input
            type="text"
            value={slugInput}
            onChange={(e) => setSlugInput(e.target.value)}
            placeholder="Enter slug(s), comma-separated..."
            style={{ 
              width: '120px', 
              fontSize: '10px', 
              padding: '2px', 
              marginRight: '2px',
              background: '#333',
              color: 'white',
              border: '1px solid #555'
            }}
          />
          <button 
            onClick={handleSlugFocus}
            style={{ margin: '2px', padding: '2px 4px', fontSize: '10px' }}
          >
            Focus Slug
          </button>
          <button 
            onClick={handleSlugHighlight}
            style={{ margin: '2px', padding: '2px 4px', fontSize: '10px', backgroundColor: '#ff9800' }}
          >
            Highlight Slug
          </button>
        </div>

        <div style={{ marginTop: '8px' }}>
          <div>Tag Input:</div>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Enter tag(s), comma-separated..."
            style={{ 
              width: '120px', 
              fontSize: '10px', 
              padding: '2px', 
              marginRight: '2px',
              background: '#333',
              color: 'white',
              border: '1px solid #555'
            }}
          />
          <button 
            onClick={handleTagFocus}
            style={{ margin: '2px', padding: '2px 4px', fontSize: '10px' }}
          >
            Focus Tag
          </button>
          <button 
            onClick={handleTagHighlight}
            style={{ margin: '2px', padding: '2px 4px', fontSize: '10px', backgroundColor: '#ff9800' }}
          >
            Highlight Tag
          </button>
          <button 
            onClick={() => graphControl.clearHighlight('sidenav')}
            style={{ margin: '2px', padding: '2px 4px', fontSize: '10px', backgroundColor: '#f44336' }}
          >
            Clear Highlights
          </button>
        </div>

        <div style={{ marginTop: '8px' }}>
          <button 
            onClick={() => {
              const path = window.location.pathname;
              console.log(`[Debug] Current URL: ${path}`);
              graphControl.handleUrlCurrentFocus(path, 'sidenav');
            }}
            style={{ margin: '2px', padding: '2px 4px', fontSize: '10px' }}
          >
            Test Current URL
          </button>
        </div>

        <div style={{ marginTop: '8px', fontSize: '10px', color: '#ccc' }}>
          <div>Usage:</div>
          <div>• Slug: post slug or category slug (comma-separated for multiple)</div>
          <div>• Tag: exact tag name (comma-separated for multiple)</div>
          <div>• Check console for logs</div>
        </div>
      </div>
    );
  };

  if (!siteMap) {
    return <Component {...pageProps} />
  }

  const appContextValue = {
    siteMap,
    pageInfo
  }

  return (
    <AppContext.Provider value={appContextValue}>
      <DebugControls />
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
        {siteMap && (
          <SideNav
            siteMap={siteMap}
            isCollapsed={!showDesktopSideNav}
            isMobileMenuOpen={isMobileMenuOpen}
          />
        )}
        {siteMap && (pageProps.pageId || router.pathname.startsWith('/tag/') || router.pathname === '/all-tags') && (
          <div
            style={{
              position: 'fixed',
              top: 16,
              left: showDesktopSideNav ? 'calc(var(--sidenav-width) + 32px)' : 0,
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
