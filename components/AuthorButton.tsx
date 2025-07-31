import Image from 'next/image'
import React, { useState } from 'react'
import siteConfig from 'site.config'

import styles from '@/styles/components/AuthorButton.module.css'

export function AuthorButton({ authorName }: { authorName: string }) {
  const [isImageError, setIsImageError] = useState(false)

  if (!authorName || authorName.trim() === '') {
    return null
  }

  const author = siteConfig.authors?.find((a) => a.name === authorName)

  const hasAvatar = author && author.avatar_dir && !isImageError
  const canClick = author && author.home_url

  const authorComponent = (
    <div
      className={`${styles.authorButton} ${hasAvatar ? styles.withAvatar : ''}`}
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
