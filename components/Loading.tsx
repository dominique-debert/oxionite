import * as React from 'react'
import styles from 'styles/components/common.module.css'

export function Loading() {
  return (
    <div className={styles.loading}>
      <div className={styles.loadingIcon} />
    </div>
  )
}
