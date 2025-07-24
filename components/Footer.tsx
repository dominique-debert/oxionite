import cs from 'classnames'
import * as React from 'react'
import styles from 'styles/components/common.module.css'

import * as config from '@/lib/config'

import { PageSocial } from './PageSocial'

export function FooterImpl({ isMobile }: { isMobile: boolean }) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div
        className={cs(
          styles.footerContent,
          !isMobile && styles.footerContentWithSideNav
        )}
      >
        <div className={styles.copyright}>
          Copyright {currentYear} {config.author}
        </div>

        <PageSocial />
      </div>
    </footer>
  )
}

export const Footer = React.memo(FooterImpl)
