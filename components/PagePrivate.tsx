import * as React from 'react'

import { PageHead } from '@/components/PageHead'

export function PagePrivate() {
  return (
    <>
      <PageHead title='Private Page' />
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