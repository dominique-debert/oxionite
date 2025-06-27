import { type GetStaticProps } from 'next'

import { NotionPage } from '@/components/NotionPage'
import { getSiteMap } from '@/lib/get-site-map'
import { getPage } from '@/lib/notion'
import { type PageProps, type Params } from '@/lib/types'
import { isDev } from '@/lib/config'

export const getStaticProps: GetStaticProps<PageProps, Params> = async (
  context
) => {
  const pageId = context.params?.pageId as string

  try {
    const siteMap = await getSiteMap()
    const recordMap = await getPage(pageId)

    return {
      props: {
        site: siteMap.site,
        recordMap,
        pageId,
        siteMap
      },
      revalidate: 10
    }
  } catch (err) {
    console.error('page error', pageId, err)

    // we don't want to publish the error version of this page, so
    // let next.js know explicitly that incremental SSG failed
    throw err
  }
}

export async function getStaticPaths() {
  if (isDev) {
    return {
      paths: [],
      fallback: 'blocking'
    }
  }

  const siteMap = await getSiteMap()

  const staticPaths = {
    paths: Object.keys(siteMap.pageInfoMap).map((pageId) => ({
      params: {
        pageId
      }
    })),
    fallback: true
  }

  console.log(
    'Generated static paths for',
    staticPaths.paths.length,
    'pages'
  )

  return staticPaths
}

export default function NotionDomainDynamicPage(props: PageProps) {
  return <NotionPage {...props} />
}