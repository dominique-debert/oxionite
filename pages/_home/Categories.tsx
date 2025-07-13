import React from 'react'
import Link from 'next/link'
import type { SiteMap } from '@/lib/types'
import styles from 'styles/pages/home.module.css'

interface CategoriesProps {
  siteMap?: SiteMap
}

const Categories: React.FC<CategoriesProps> = ({ siteMap }) => {
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

export default Categories 