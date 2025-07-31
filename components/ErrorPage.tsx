import * as React from 'react'
import styles from 'styles/components/common.module.css'

import type { Site } from '@/lib/context/types'

import { PageHead } from './PageHead'

interface ErrorPageProps {
  statusCode: number
  site: Site
}

export function ErrorPage({ statusCode, site }: ErrorPageProps) {
  const title = statusCode === 404 ? 'Page Not Found' : 'Error'

  return (
    <>
      <PageHead site={site} title={title} />
      <div className={styles.container}>
        <main className={styles.main}>
          <h1>{title}</h1>

          {statusCode === 404 && (
            <p>We can't seem to find the page you're looking for.</p>
          )}
        </main>
      </div>
    </>
  )
}
