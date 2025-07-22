import * as React from 'react'
import styles from 'styles/components/common.module.css'

import * as config from '@/lib/config'

import { PageSocial } from './PageSocial'

export function FooterImpl() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.copyright}>
          Copyright {currentYear} {config.author}
        </div>

        <PageSocial />
      </div>
    </footer>
  )
}

export const Footer = React.memo(FooterImpl)
