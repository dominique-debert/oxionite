import * as React from 'react'
import styles from 'styles/components/common.module.css'
import { useTranslation } from 'next-i18next'
import Link from 'next/link'

import type { Site } from '@/lib/context/types'

import { PageHead } from './PageHead'

interface ErrorPageProps {
  statusCode: number
  site?: Site
}

export function ErrorPage({ statusCode, site }: ErrorPageProps) {
  const { t } = useTranslation('common')
  const title = statusCode === 404 ? t('error.404.title') : t('error.default.title')
  const description = statusCode === 404 ? t('error.404.description') : t('error.default.description')

  return (
    <>
      <PageHead site={site} title={title} />
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <h1 className={styles.errorTitle}>{title}</h1>
          <p className={styles.errorDescription}>{description}</p>
        </div>
      </div>
    </>
  )
}
