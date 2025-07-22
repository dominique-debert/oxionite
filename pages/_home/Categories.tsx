import Link from 'next/link'
import React from 'react'
import styles from 'styles/pages/home.module.css'

import type { SiteMap } from '@/lib/types'

interface CategoriesProps {
  siteMap?: SiteMap
}

export default function Categories({ siteMap }: CategoriesProps) {
  const categories = React.useMemo(() => {
    if (!siteMap) return []
    return Object.values(siteMap.pageInfoMap)
      .filter((page) => page.type === 'Category')
      .slice(0, 8)
  }, [siteMap])

  return (
    <section className={styles.categoriesGrid}>
      {categories.map((category) => (
        <Link
          key={category.pageId}
          href={`/categories/${category.slug}`}
          className={styles.categoryCard}
        >
          <h3 className={styles.categoryName}>{category.title}</h3>
          <p className={styles.categoryDescription}>
            {category.description || 'Explore this category'}
          </p>
        </Link>
      ))}
    </section>
  )
}

 