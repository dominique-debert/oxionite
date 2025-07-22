import * as React from 'react'
import styles from 'styles/components/common.module.css'

import type { Site } from '@/lib/types'
import * as config from '@/lib/config'

import { PageHead } from './PageHead'

export const ErrorPage: React.FC<{ statusCode: number, site: Site }> = ({ statusCode, site }) => {
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
