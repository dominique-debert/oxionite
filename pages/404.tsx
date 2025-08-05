import { getSiteMap } from '@/lib/context/get-site-map'
import { ErrorPage } from '@/components/ErrorPage'
import { PageHead } from 'components/PageHead'
import * as React from 'react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import nextI18NextConfig from '../next-i18next.config.cjs'

import type { PageProps } from '@/lib/context/types'

export const getStaticProps = async ({ locale }: { locale: string }) => {
  const siteMap = await getSiteMap()
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'languages'], nextI18NextConfig)),
      siteMap
    },
    revalidate: 1
  }
}

export default function Page404({ siteMap }: PageProps) {
  return (
    <>
      <PageHead site={siteMap?.site} title='Page Not Found' />
      <ErrorPage site={siteMap?.site} statusCode={404} />
    </>
  )
}
