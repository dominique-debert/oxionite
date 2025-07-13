import React from 'react'
import type { Site } from '@/lib/types'
import styles from 'styles/pages/home.module.css'

interface HeroProps {
  site: Site
}

const Hero: React.FC<HeroProps> = ({ site }) => {
  return (
    <section className={styles.heroSection}>
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>{site.name}</h1>
        <p className={styles.heroDescription}>
          {site.description || 'Welcome to our blog'}
        </p>
      </div>
    </section>
  )
}

export default Hero 