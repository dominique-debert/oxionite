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
import { NotionPageHeader } from '@/components/NotionPageHeader'

if (typeof window !== 'undefined') {
  bootstrap()
}

// Simple custom header component with breadcrumbs
function CustomPageHeader({ pageProps, block }: { pageProps: types.PageProps, block: any }) {
  const { siteMap } = pageProps
  
  // Build breadcrumbs from siteMap if available
  const breadcrumbs = React.useMemo(() => {
    if (!siteMap || !pageProps.pageId) return []
    
    const findPagePath = (pageId: string): string[] => {
      // Find the page in siteMap
      const findInMap = (items: any[], path: string[] = []): string[] | null => {
        for (const item of items) {
          if (item.pageId === pageId) {
            return [...path, item.title || item.name || 'Untitled']
          }
          if (item.children) {
            const result = findInMap(item.children, [...path, item.title || item.name || 'Untitled'])
            if (result) return result
          }
        }
        return null
      }
      
      return findInMap(siteMap.navigationTree || []) || []
    }
    
    return findPagePath(pageProps.pageId)
  }, [siteMap, pageProps.pageId])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem 0',
      minHeight: '60px'
    }}>
      {/* Breadcrumbs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '14px',
        color: 'var(--text-color, #666)'
      }}>
        <span>🏠</span>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span style={{ margin: '0 0.5rem' }}>›</span>}
            <span style={{ 
              fontWeight: index === breadcrumbs.length - 1 ? 600 : 400,
              color: index === breadcrumbs.length - 1 ? 'var(--text-color, #000)' : 'var(--text-color, #666)'
            }}>
              {crumb}
            </span>
          </React.Fragment>
        ))}
      </div>
      
      {/* Right side - can add search, theme toggle etc later */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Placeholder for future features */}
      </div>
    </div>
  )
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
  const { siteMap, recordMap } = pageProps

  // Extract block from recordMap for search functionality
  const keys = Object.keys(recordMap?.block || {})
  const block = keys[0] ? recordMap?.block?.[keys[0]]?.value : undefined

  // DEBUG: Let's see what we're getting
  console.log('DEBUG _app.tsx - pageProps:', pageProps)
  console.log('DEBUG _app.tsx - siteMap exists:', !!siteMap)
  console.log('DEBUG _app.tsx - block exists:', !!block)

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
            <CustomPageHeader pageProps={pageProps} block={block} />
          </div>
        )}
        
        <div style={{ 
          flex: 1,
          overflow: 'auto',
          paddingRight: '20rem' // Move the NotionRenderer to the left
        }}>
          <Component {...pageProps} />
        </div>
      </main>
    </div>
  )
}