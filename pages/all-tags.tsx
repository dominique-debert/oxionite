import { getSiteMap } from '@/lib/context/get-site-map'
import type { PageProps } from '@/lib/context/types'
import { PageHead } from '@/components/PageHead'
import { TagList } from '@/components/TagList'
import styles from '@/styles/components/all-tags.module.css'

export const getStaticProps = async () => {
  const siteMap = await getSiteMap()
  return {
    props: {
      siteMap
    },
    revalidate: 10
  }
}

export default function AllTagsPage({ siteMap }: PageProps) {
  if (!siteMap) {
    return null
  }
  return (
    <>
      <PageHead 
        site={siteMap.site}
        title="All Tags"
        description="A complete list of all tags used on the site."
      />
      <div className={styles.container}>
        <h1 className={styles.title}>All Tags</h1>
        <TagList />
      </div>
    </>
  )
}
