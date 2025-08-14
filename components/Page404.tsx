import Image from 'next/image'
import { useRouter } from 'next/router'
import styles from 'styles/components/common.module.css'

import type * as types from '@/lib/context/types'

import { PageHead } from './PageHead'

export function Page404({ site, pageId, error }: Partial<types.PageProps>) {
  const router = useRouter()
  const title = site?.name || 'Notion Page Not Found'

  return (
    <>
      <PageHead site={site} title={title} url={router.asPath} />

      <div className={styles.container}>
        <main className={styles.main}>
          <h1>Notion Page Not Found</h1>

          {error ? (
            <p>{error.message}</p>
          ) : (
            pageId && (
              <p>
                Make sure that Notion page &quot;{pageId}&quot; is publicly
                accessible.
              </p>
            )
          )}

          <Image
            src='/404.png'
            alt='404 Not Found'
            className={styles.errorImage}
            width={400}
            height={300}
          />
        </main>
      </div>
    </>
  )
}
