import { ErrorPage } from 'components/ErrorPage'
import { PageHead } from 'components/PageHead'
import * as React from 'react'

import type { Site } from '@/lib/types'

import site from '../site.config'

export async function getStaticProps() {
  return {
    props: {
      site
    },
    revalidate: 1
  }
}

export default function Page404({ site }: { site: Site }) {
  return (
    <>
      <PageHead site={site} title='Page Not Found' />
      <ErrorPage site={site} statusCode={404} />
    </>
  )
}
