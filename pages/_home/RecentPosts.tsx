import React from 'react'
import Link from 'next/link'
import type { SiteMap } from '@/lib/types'
import styles from 'styles/pages/home.module.css'

interface RecentPostsProps {
  siteMap?: SiteMap
}

const RecentPosts: React.FC<RecentPostsProps> = ({ siteMap }) => {
  const recentPosts = React.useMemo(() => {
    if (!siteMap) return []
    return Object.values(siteMap.pageInfoMap)
      .filter((page) => page.type === 'Post')
      .slice(0, 6)
  }, [siteMap])

  return (
    <section className={styles.postsGrid}>
      {recentPosts.map((post) => (
        <article key={post.pageId} className={styles.postCard}>
          <Link href={`/posts/${post.slug}`} className={styles.postLink}>
            <div className={styles.postContent}>
              <h3 className={styles.postTitle}>{post.title}</h3>
              <p className={styles.postExcerpt}>
                {post.description || 'Click to read more...'}
              </p>
              <div className={styles.postMeta}>
                <time className={styles.postDate}>
                  {new Date(
                  ).toLocaleDateString()}
                </time>
              </div>
            </div>
          </Link>
        </article>
      ))}
    </section>
  )
}

export default RecentPosts 