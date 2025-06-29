// used for rendering equations (optional)
import 'katex/dist/katex.min.css'
// used for code syntax highlighting (optional)
import 'prismjs/themes/prism-coy.css'
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

import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import * as Fathom from 'fathom-client'
import { posthog } from 'posthog-js'
import * as React from 'react'

import { bootstrap } from '@/lib/bootstrap-client'
import {
  fathomConfig,
  fathomId,
  isServer,
  posthogConfig,
  posthogId
} from '@/lib/config'
import * as types from '@/lib/types'
import { SideNav } from '@/components/SideNav'
import { TopNav } from '@/components/TopNav'

if (typeof window !== 'undefined') {
  bootstrap()
}



export default function App({ Component, pageProps }: AppProps<types.PageProps>) {
  const router = useRouter()

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

  // Extract block from recordMap for search functionality
  const keys = Object.keys(recordMap?.block || {})
  const block = keys[0] ? recordMap?.block?.[keys[0]]?.value : undefined

  // Get page info to determine layout style
  const pageInfo = siteMap && pageId ? siteMap.pageInfoMap[pageId] : null
  const isCategory = pageInfo?.type === 'Category'

  // Calculate TOC display in real-time instead of using state
  const showTOC = React.useMemo(() => {
    if (!block || !recordMap?.block) return false
    
    const isBlogPost = block?.type === 'page' && block?.parent_table === 'collection'
    if (!isBlogPost) return false
    
    // Count headers
    let headerCount = 0
    Object.values(recordMap.block).forEach((blockWrapper: any) => {
      const blockData = blockWrapper?.value
      if (blockData?.type === 'header' || blockData?.type === 'sub_header' || blockData?.type === 'sub_sub_header') {
        headerCount++
      }
    })
    
    const minTableOfContentsItems = 3
    const result = headerCount >= minTableOfContentsItems
    
    console.log('DEBUG _app.tsx - Real-time TOC calculation:', {
      isBlogPost,
      headerCount,
      minTableOfContentsItems,
      showTOC: result
    })
    
    return result
  }, [block, recordMap])

  // DEBUG: Let's see what we're getting
  console.log('DEBUG _app.tsx - pageProps:', pageProps)
  console.log('DEBUG _app.tsx - siteMap exists:', !!siteMap)
  console.log('DEBUG _app.tsx - block exists:', !!block)
  console.log('DEBUG _app.tsx - isCategory:', isCategory)
  console.log('DEBUG _app.tsx - showTOC calculated:', showTOC)
  
  const paddingRight = showTOC ? '30rem' : '0'
  console.log('DEBUG _app.tsx - paddingRight will be:', paddingRight)

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh',
      overflow: 'hidden'
    }}>
      {/* Render our SideNav component when siteMap is available */}
      {siteMap && (
        <div style={{ 
          flexShrink: 0,
          width: '280px',
          height: '100vh',
          overflowY: 'auto'
        }}>
          <SideNav siteMap={siteMap} block={block} />
        </div>
      )}

      <main style={{ 
        flex: 1, 
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden'
      }}>
        {/* Custom header with breadcrumbs - only for main content area */}
        {siteMap && pageProps.pageId && (
          <div style={{ 
            flexShrink: 0,
            borderBottom: '1px solid var(--border-color, rgba(55, 53, 47, 0.16))',
            padding: '0 2rem',
            backgroundColor: 'var(--bg-color, #ffffff)',
            backdropFilter: 'blur(8px)',
            transition: 'background-color 0.2s ease'
          }}>
            <TopNav pageProps={pageProps} block={block} />
          </div>
        )}
        
        <div style={{ 
          flex: 1,
          overflow: 'auto',
          paddingRight: paddingRight,
          display: isCategory ? 'flex' : 'block',
          justifyContent: isCategory ? 'center' : 'flex-start'
        }}>
          <Component {...pageProps} />
        </div>
      </main>
    </div>
  )
}