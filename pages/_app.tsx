// used for rendering equations (optional)
import 'katex/dist/katex.min.css'
// used for code syntax highlighting (optional)
import 'prismjs/themes/prism-coy.css'
// core styles shared by all of react-notion-x (required)
import 'react-notion-x/src/styles.css'
// global styles shared across the entire site
import 'styles/global.css'
// this might be better for dark mode
// import 'prismjs/themes/prism-okaidia.css'
// global style overrides for notion
import 'styles/notion.css'
// global style overrides for prism theme (optional)
import 'styles/prism-theme.css'

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
import type { PageProps } from '@/lib/types'

if (!isServer) {
  bootstrap()
}

export default function App({ Component, pageProps }: AppProps<PageProps>) {
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

  // Extract siteMap from pageProps. The rest of the props are passed to the page.
  const { siteMap, ...restPageProps } = pageProps

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      {/* 
        This is where our new SideNav will go. 
        It will receive the siteMap to build the navigation tree.
        We check if siteMap exists, because some pages like 404 might not have it.
      */}
      {siteMap && (
        <aside
          style={{
            width: '280px',
            padding: '2rem 1rem',
            height: '100vh',
            position: 'sticky',
            top: 0,
            overflowY: 'auto',
            flexShrink: 0,
            borderRight: '1px solid #efefef'
          }}
        >
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Navigation</h2>
          <p style={{ color: '#555', fontSize: '0.9rem' }}>
            The category tree will be rendered here.
          </p>

          {/* 
            This is a temporary debug view to confirm that the siteMap data 
            is being passed correctly. We will replace this with the actual 
            SideNav component later.
          */}
          <pre
            style={{
              fontSize: 10,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              maxHeight: '400px',
              overflow: 'auto',
              background: '#f7f7f7',
              padding: '8px',
              borderRadius: '4px'
            }}
          >
            {JSON.stringify(siteMap.navigationTree, null, 2)}
          </pre>
        </aside>
      )}

      <main style={{ flex: 1, minWidth: 0 }}>
        <Component {...restPageProps} />
      </main>
    </div>
  )
}