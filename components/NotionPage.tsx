import React from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'

import {
  formatDate,
  getBlockTitle,
  getPageProperty,
  normalizeTitle
} from 'notion-utils'
import { getTextContent } from 'notion-utils'
import {
  type NotionComponents,
  NotionRenderer,
  Search,
  useNotionContext
} from 'react-notion-x'

import { Loading } from './Loading'
import { PageHead } from './PageHead'
import { Page404 } from './Page404'
import TruncatedTOC from './TruncatedTOC'
import styles from './styles.module.css'

import * as config from '@/lib/config'
import { mapImageUrl } from '@/lib/map-image-url'
import { getCanonicalPageUrl, mapPageUrl } from '@/lib/map-page-url'
import { searchNotion } from '@/lib/search-notion'
import { useDarkMode } from '@/lib/use-dark-mode'
import * as types from '@/lib/types'
import cs from 'classnames'

// -----------------------------------------------------------------------------
// dynamic imports for optional components
// -----------------------------------------------------------------------------

const Code2 = dynamic(() =>
  import('react-notion-x/build/third-party/code').then(async (m) => {
    // additional prism syntaxes
    await Promise.all([
      // @ts-ignore
      import('prismjs/components/prism-markup-templating'),
      // @ts-ignore
      import('prismjs/components/prism-markup'),
      // @ts-ignore
      import('prismjs/components/prism-bash'),
      // @ts-ignore
      import('prismjs/components/prism-c'),
      // @ts-ignore
      import('prismjs/components/prism-cpp'),
      // @ts-ignore
      import('prismjs/components/prism-csharp'),
      // @ts-ignore
      import('prismjs/components/prism-docker'),
      // @ts-ignore
      import('prismjs/components/prism-java'),
      // @ts-ignore
      import('prismjs/components/prism-js-templates'),
      // @ts-ignore
      import('prismjs/components/prism-coffeescript'),
      // @ts-ignore
      import('prismjs/components/prism-diff'),
      // @ts-ignore
      import('prismjs/components/prism-git'),
      // @ts-ignore
      import('prismjs/components/prism-go'),
      // @ts-ignore
      import('prismjs/components/prism-graphql'),
      // @ts-ignore
      import('prismjs/components/prism-handlebars'),
      // @ts-ignore
      import('prismjs/components/prism-less'),
      // @ts-ignore
      import('prismjs/components/prism-makefile'),
      // @ts-ignore
      import('prismjs/components/prism-markdown'),
      // @ts-ignore
      import('prismjs/components/prism-objectivec'),
      // @ts-ignore
      import('prismjs/components/prism-ocaml'),
      // @ts-ignore
      import('prismjs/components/prism-python'),
      // @ts-ignore
      import('prismjs/components/prism-reason'),
      // @ts-ignore
      import('prismjs/components/prism-rust'),
      // @ts-ignore
      import('prismjs/components/prism-sass'),
      // @ts-ignore
      import('prismjs/components/prism-scss'),
      // @ts-ignore
      import('prismjs/components/prism-solidity'),
      // @ts-ignore
      import('prismjs/components/prism-sql'),
      // @ts-ignore
      import('prismjs/components/prism-stylus'),
      // @ts-ignore
      import('prismjs/components/prism-swift'),
      // @ts-ignore
      import('prismjs/components/prism-wasm'),
      // @ts-ignore
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
const EmptyHeader = () => null

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

export const NotionPage: React.FC<types.PageProps> = ({
  site,
  recordMap,
  error,
  pageId,
  siteMap
}) => {
  const router = useRouter()
  const { isDarkMode } = useDarkMode()

  if (router.isFallback) {
    return <Loading />
  }

  if (error || !site || !pageId || !recordMap) {
    return <Page404 />
  }

  const keys = Object.keys(recordMap?.block || {})
  const block = keys[0] ? recordMap?.block?.[keys[0]]?.value : undefined

  if (!block) {
    return <Page404 />
  }

  const title = getBlockTitle(block, recordMap) || site.name

  // Check if this is a blog post (collection item)
  const isBlogPost = block?.type === 'page' && block?.parent_table === 'collection'

  // Table of contents settings
  const showTableOfContents = !!isBlogPost
  const minTableOfContentsItems = 3

  // Create page URL mapper for proper navigation
  const siteMapPageUrl = React.useMemo(() => {
    const searchParams = new URLSearchParams()
    return site ? mapPageUrl(site, recordMap, searchParams) : undefined
  }, [site, recordMap])

  console.log('NotionPage debug:', {
    pageId,
    rootNotionPageId: site.rootNotionPageId,
    recordMapKeys: Object.keys(recordMap?.block || {}),
    hasRecordMap: !!recordMap,
    blockId: block?.id,
    blockType: block?.type,
    isBlogPost,
    showTableOfContents
  })

  return (
    <>
      <PageHead
        pageId={pageId}
        site={site}
        title={title}
      />

      <div className="notion-page">
        <div className='notion-viewport'>
          <div className={cs(styles.main, styles.hasSideNav)}>
            <NotionRenderer
              bodyClassName={cs(
                styles.notion,
                pageId === site.rootNotionPageId && 'index-page'
              )}
              darkMode={isDarkMode}
              recordMap={recordMap}
              rootPageId={site.rootNotionPageId || undefined}
              fullPage={true}
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
                nextImage: Image,
                nextLink: Link,
                Code: Code2,
                Collection: Collection2,
                Equation: Equation2,
                Pdf,
                Modal: Modal2,
                Tweet,
                Header: EmptyHeader,
                propertyLastEditedTimeValue,
                propertyDateValue,
                propertyTextValue
              }}
            />
            
            {/* Enhanced TruncatedTOC with scroll spy functionality */}
            {showTableOfContents && <TruncatedTOC />}
          </div>
        </div>
      </div>
    </>
  )
}
