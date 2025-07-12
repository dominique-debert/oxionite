import React from 'react'
import type { SiteMap } from '@/lib/types'
import styles from './styles.module.css'

interface TagsProps {
  siteMap?: SiteMap
}

const Tags: React.FC<TagsProps> = ({ siteMap }) => {
  return (
    <div className={styles.tagsContainer}>
      <h2>Tags</h2>
      <p>Tags functionality will be implemented soon.</p>
    </div>
  )
}

export default Tags 