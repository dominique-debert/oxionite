import React, { useState } from 'react'
import Image from 'next/image'
import siteConfig from 'site.config'
import styles from '@/styles/components/PageAuthor.module.css'

export const PageAuthor = ({ authorName }: { authorName: string }) => {
  const author = siteConfig.authors?.find((a) => a.name === authorName)
  const [isImageError, setIsImageError] = useState(false)

  const hasAvatar = author && author.avatar_dir && !isImageError
  const canClick = author && author.home_url

  const authorComponent = (
    <div
      className={`${styles.pageAuthor} ${hasAvatar ? styles.withAvatar : ''}`}
    >
      {hasAvatar && (
        <Image
          className={styles.avatar}
          src={author.avatar_dir}
          alt={author.name}
          width={28}
          height={28}
          onError={() => setIsImageError(true)}
        />
      )}
      <span className={styles.name}>{authorName}</span>
    </div>
  )

  if (canClick) {
    return (
      <a
        href={author.home_url}
        target='_blank'
        rel='noopener noreferrer'
        style={{ textDecoration: 'none' }}
      >
        {authorComponent}
      </a>
    )
  }

  return authorComponent
}
