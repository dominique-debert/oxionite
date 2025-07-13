import * as React from 'react'
import styles from 'styles/components/common.module.css'

export const Loading: React.FC = () => {
  return (
    <div className={styles.loading}>
      <div className={styles.loadingIcon} />
    </div>
  )
}
