import { ErrorPage } from '@/components/ErrorPage'
import { PageHead } from 'components/PageHead'
import * as React from 'react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import nextI18NextConfig from '../next-i18next.config.cjs'

import type { Site } from '@/lib/context/types'

import site from '../site.config'

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'], nextI18NextConfig)),
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
