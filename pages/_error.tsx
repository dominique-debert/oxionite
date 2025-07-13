import * as React from 'react'
import { ErrorPage } from 'components/ErrorPage'
import type { PageProps } from '@/lib/types'
import site from 'site.config'
import type { NextPageContext } from 'next'

const CustomErrorPage = ({ statusCode }: { statusCode: number }) => {
  return <ErrorPage site={site} statusCode={statusCode} />
}

CustomErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default CustomErrorPage
