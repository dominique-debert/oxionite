import * as React from 'react'
import { useRouter } from 'next/router'

import { PageHead } from '@/components/PageHead'

export function PagePrivate() {
  const router = useRouter()
  return (
    <>
      <PageHead title='Private Page' url={`/${router.locale}${router.asPath === '/' ? '' : router.asPath}`} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          textAlign: 'center'
        }}
      >
        <h1>🔒 Private Page</h1>
        <p>This page is not public and cannot be viewed.</p>
        <p>Please contact the site administrator if you believe this is an error.</p>
      </div>
    </>
  )
}