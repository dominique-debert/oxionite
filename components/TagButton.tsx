import React from 'react'
import { useRouter } from 'next/router'
import { useAppContext } from '@/lib/context/app-context'

import styles from '@/styles/components/TagButton.module.css'

interface TagButtonProps {
  tag: string
}

export function TagButton({ tag }: TagButtonProps) {
  const router = useRouter()
  const { siteMap, pageInfo } = useAppContext()
  const locale = router.locale!

  if (!tag || tag.trim() === '') {
    return null
  }

  // Get tag count from siteMap using existing tag graph data
  const getTagCount = () => {
    try {
      const count = siteMap?.tagGraphData?.locales?.[locale]?.tagCounts?.[tag] || 0;
      return count;
    } catch (error) {
      console.warn('Error accessing tag count:', error)
      return 0
    }
  }

  const tagCount = getTagCount()
  
  const handleClick = () => {
    void router.push(`/tag/${encodeURIComponent(tag)}`)
  }

  return (
    <button
      className={`${styles.tagButton} ${tagCount > 0 ? styles.hasBadge : ''}`}
      onClick={handleClick}
      type="button"
    >
      <div className={styles.tagContent}>
        <span className={styles.tagName}># {tag}</span>
        {tagCount > 0 && (
          <span className={styles.tagCount}>{tagCount}</span>
        )}
      </div>
    </button>
  )
}