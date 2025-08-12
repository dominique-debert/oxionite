import cs from 'classnames'
import dynamic from 'next/dynamic'
import Image, { type ImageProps } from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  formatDate,
  getPageProperty
} from 'notion-utils'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { NotionRenderer } from 'react-notion-x'

import type * as types from '@/lib/context/types'
import * as config from '@/lib/config'
import { buildPageUrl } from '@/lib/context/build-page-url'
import { mapImageUrl } from '@/lib/map-image-url'
import { searchNotion } from '@/lib/search-notion'
import { useDarkMode } from '@/lib/use-dark-mode'
import localeConfig from '../site.locale.json'
import styles from 'styles/components/common.module.css'

import { Loading } from './Loading'
import { NotionComments } from './NotionComments'
import { Page404 } from './Page404'
import { PageActions } from './PageActions'
import { PostHeader } from './PostHeader'

// -----------------------------------------------------------------------------
// dynamic imports for optional components
// -----------------------------------------------------------------------------

const Code2 = dynamic(() =>
  import('react-notion-x/build/third-party/code').then(async (m) => {
    // additional prism syntaxes
    await Promise.all([
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-markup-templating'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-markup'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-bash'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-c'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-cpp'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-csharp'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-docker'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-java'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-js-templates'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-coffeescript'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-diff'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-git'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-go'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-graphql'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-handlebars'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-less'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-makefile'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-markdown'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-objectivec'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-ocaml'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-python'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-reason'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-rust'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-sass'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-scss'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-solidity'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-sql'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-stylus'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-swift'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-wasm'),
      // @ts-expect-error component is not typed correctly
      import('prismjs/components/prism-yaml')
    ])
    return m.Code
  })
)

const Collection2 = dynamic(() =>
  import('react-notion-x/build/third-party/collection').then(
    (m) => m.Collection
  )
)
const Equation2 = dynamic(() =>
  import('react-notion-x/build/third-party/equation').then((m) => m.Equation)
)
const Pdf = dynamic(
  () => import('react-notion-x/build/third-party/pdf').then((m) => m.Pdf),
  {
    ssr: false
  }
)
const Modal2 = dynamic(
  () =>
    import('react-notion-x/build/third-party/modal').then((m) => {
      m.Modal.setAppElement('.notion-viewport')
      return m.Modal
    }),
  {
    ssr: false
  }
)

const Tweet = dynamic(() => import('react-tweet').then((m) => m.Tweet))

// Empty header component to hide the default notion header
function EmptyHeader() {
  return null
}

// Custom property value for last edited time
const propertyLastEditedTimeValue = (
  { block, pageHeader }: any,
  defaultFn: () => React.ReactNode
) => {
  if (pageHeader && block?.last_edited_time) {
    return `Last updated ${formatDate(block?.last_edited_time, {
      month: 'long'
    })}`
  }

  return defaultFn()
}

const propertyDateValue = (
  { data, schema, pageHeader }: any,
  defaultFn: () => React.ReactNode
) => {
  if (pageHeader && schema?.name?.toLowerCase() === 'published') {
    const publishDate = data?.[0]?.[1]?.[0]?.[1]?.start_date

    if (publishDate) {
      return `${formatDate(publishDate, {
        month: 'long'
      })}`
    }
  }

  return defaultFn()
}

const propertyTextValue = (
  { schema, pageHeader }: any,
  defaultFn: () => React.ReactNode
) => {
  if (pageHeader && schema?.name?.toLowerCase() === 'author') {
    return <b>{defaultFn()}</b>
  }

  return defaultFn()
}



export function NotionPageContent({
  site,
  recordMap,
  error,
  pageId,
  siteMap,
  isMobile = false,
  showTOC = false
}: types.PageProps) {
  const router = useRouter()
  const { isDarkMode } = useDarkMode()

  const [isShowingComments, setIsShowingComments] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
    setIsShowingComments(false)
  }, [pageId])

  // Current path context for hierarchical routing
  
  const siteMapPageUrl = useCallback(
    (pageId = '') => {
      if (pageId && siteMap) {
        // Extract current path from URL for hierarchical routing
        const pathSegments = router.asPath.split('/').filter(Boolean)
        const postIndex = pathSegments.indexOf('post')
        const currentPath = postIndex !== -1 ? pathSegments.slice(postIndex + 1) : []
        
        return buildPageUrl(pageId, siteMap, currentPath, router.locale || localeConfig.defaultLocale)
      }
      return '/'
    },
    [siteMap, router.asPath, router.locale]
  )   

  const { block, tweetId } = useMemo(() => {
    const block = recordMap?.block?.[pageId!]?.value

    if (block && recordMap) {
      const tweetId = getPageProperty<string>('Tweet', block, recordMap)
      return { block, tweetId }
    }

    return { block: undefined, tweetId: undefined }
  }, [pageId, recordMap])

  const memoizedActions = useMemo(
    () => (tweetId ? <PageActions tweet={tweetId} /> : null),
    [tweetId]
  )

  const memoizedComments = useMemo(
    () => (recordMap ? <NotionComments recordMap={recordMap} /> : null),
    [recordMap]
  )

  if (router.isFallback) {
    return <Loading />
  }

  if (error || !site || !pageId || !recordMap || !block) {
    return <Page404 />
  }

  const pageInfo = siteMap?.pageInfoMap?.[pageId]

  const isBlogPost =
    !!(pageInfo && block?.type === 'page' && block?.parent_table === 'collection')
  const isSubPage = !pageInfo && block?.type === 'page'
  const minTableOfContentsItems = 3
  const showTableOfContents = showTOC

  return (
    <>
      <div className={cs('notion-page', isMobile && 'mobile')}>
        <div className='notion-viewport'>
          <div className={cs(styles.main, styles.hasSideNav)}>
            {/* Show our custom header for both top-level posts and sub-pages */}
            {(isBlogPost || isSubPage) && (
              <PostHeader
                block={block}
                recordMap={recordMap}
                siteMap={siteMap}
                isBlogPost={isBlogPost} // Still needed for internal logic in PostHeader
                isMobile={isMobile}
                variant={isBlogPost ? 'full' : 'simple'}
              />
            )}
            
            <NotionRenderer
              bodyClassName={cs(
                styles.notion,
                pageId === site.rootNotionPageId && 'index-page',
                'custom-notion-page'
              )}
              darkMode={hasMounted ? isDarkMode : false}
              recordMap={recordMap}
              rootPageId={site.rootNotionPageId || undefined}
              fullPage={true} // Ensure cover, icon, and title are rendered
              previewImages={!!recordMap.preview_images}
              showCollectionViewDropdown={false}
              showTableOfContents={showTableOfContents}
              minTableOfContentsItems={minTableOfContentsItems}
              defaultPageIcon={config.defaultPageIcon}
              defaultPageCover={config.defaultPageCover}
              defaultPageCoverPosition={config.defaultPageCoverPosition}
              mapImageUrl={mapImageUrl}
              searchNotion={config.isSearchEnabled ? searchNotion : undefined}
              {...(site.domain ? { rootDomain: site.domain || undefined } : {})}
              {...(siteMapPageUrl && { mapPageUrl: siteMapPageUrl })}
              components={{
                nextImage: (props: ImageProps) => (<Image {...props} priority/>),
                nextLink: Link,
                Code: Code2,
                Collection: Collection2,
                Equation: Equation2,
                Pdf,
                Modal: Modal2,
                Tweet,
                // Always use an empty header to hide Notion's built-in header
                Header: EmptyHeader,
                propertyLastEditedTimeValue,
                propertyDateValue,
                propertyTextValue
              }}
            />
            
                        {isBlogPost && (
              <div className={styles.pageActions}>
                {memoizedActions}
              </div>
            )}

            {isShowingComments && memoizedComments}
          </div>
        </div>
      </div>
    </>
  )
}

export function NotionPage(props: types.PageProps) {
  return <NotionPageContent {...props} />
}
