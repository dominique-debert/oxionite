import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import type { PageProps } from '@/lib/types'
import { PageHead } from './PageHead'
import styles from './styles.module.css'

interface HomeProps extends PageProps {
  // Add any additional props specific to Home component
}

export const Home: React.FC<HomeProps> = ({ site, siteMap }) => {
  const router = useRouter()

  // Get recent posts from siteMap
  const recentPosts = React.useMemo(() => {
    if (!siteMap) return []
    
    return Object.values(siteMap.pageInfoMap)
      .filter(page => page.type === 'Post')
      .sort((a, b) => {
        const dateA = new Date(a.published || a.lastUpdated || 0)
        const dateB = new Date(b.published || b.lastUpdated || 0)
        return dateB.getTime() - dateA.getTime()
      })
      .slice(0, 6) // Show 6 most recent posts
  }, [siteMap])

  // Get categories from siteMap
  const categories = React.useMemo(() => {
    if (!siteMap) return []
    
    return Object.values(siteMap.pageInfoMap)
      .filter(page => page.type === 'Category')
      .slice(0, 8) // Show up to 8 categories
  }, [siteMap])

  if (!site) {
    return <div>Loading...</div>
  }

  return (
    <>
      <PageHead
        site={site}
        title={site.name}
        description={site.description}
      />

      <div className="home-page">
        <div className="home-container">
          {/* Hero Section */}
          <section className="hero-section">
            <div className="hero-content">
              <h1 className="hero-title">{site.name}</h1>
              <p className="hero-description">
                {site.description || 'Welcome to our blog'}
              </p>
              <div className="hero-actions">
                {recentPosts.length > 0 && recentPosts[0] && (
                  <Link href={`/posts/${recentPosts[0].slug}`} className="cta-button">
                    Read Latest Post
                  </Link>
                )}
              </div>
            </div>
          </section>

          {/* Recent Posts Section */}
          {recentPosts.length > 0 && (
            <section className="recent-posts-section">
              <h2 className="section-title">Recent Posts</h2>
              <div className="posts-grid">
                {recentPosts.map((post) => (
                  <article key={post.pageId} className="post-card">
                    <Link href={`/posts/${post.slug}`} className="post-link">
                      <div className="post-content">
                        <h3 className="post-title">{post.title}</h3>
                        <p className="post-excerpt">
                          {post.description || 'Click to read more...'}
                        </p>
                        <div className="post-meta">
                          <time className="post-date">
                            {new Date(post.published || post.lastUpdated || '').toLocaleDateString()}
                          </time>
                        </div>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Categories Section */}
          {categories.length > 0 && (
            <section className="categories-section">
              <h2 className="section-title">Categories</h2>
              <div className="categories-grid">
                {categories.map((category) => (
                  <Link 
                    key={category.pageId} 
                    href={`/categories/${category.slug}`}
                    className="category-card"
                  >
                    <h3 className="category-name">{category.title}</h3>
                    <p className="category-description">
                      {category.description || 'Explore this category'}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <style jsx>{`
        .home-page {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .home-container {
          display: flex;
          flex-direction: column;
          gap: 4rem;
        }

        /* Hero Section */
        .hero-section {
          text-align: center;
          padding: 4rem 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          color: white;
          margin-bottom: 2rem;
        }

        .hero-content {
          max-width: 600px;
          margin: 0 auto;
          padding: 0 2rem;
        }

        .hero-title {
          font-size: 3rem;
          font-weight: 700;
          margin-bottom: 1rem;
          line-height: 1.2;
        }

        .hero-description {
          font-size: 1.25rem;
          margin-bottom: 2rem;
          opacity: 0.9;
          line-height: 1.6;
        }

        .hero-actions {
          display: flex;
          justify-content: center;
          gap: 1rem;
        }

        .cta-button {
          display: inline-block;
          padding: 12px 24px;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .cta-button:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
          transform: translateY(-2px);
        }

        /* Section Titles */
        .section-title {
          font-size: 2rem;
          font-weight: 600;
          margin-bottom: 2rem;
          color: var(--fg-color, #37352f);
        }

        /* Posts Grid */
        .posts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .post-card {
          background: var(--bg-color, #ffffff);
          border: 1px solid var(--border-color, #e5e5e5);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .post-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .post-link {
          display: block;
          text-decoration: none;
          color: inherit;
        }

        .post-content {
          padding: 1.5rem;
        }

        .post-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--fg-color, #37352f);
          line-height: 1.4;
        }

        .post-excerpt {
          color: var(--fg-color-2, #787774);
          margin-bottom: 1rem;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .post-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
          color: var(--fg-color-3, #9b9a97);
        }

        .post-date {
          font-weight: 500;
        }

        .post-author {
          font-style: italic;
        }

        /* Categories Grid */
        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .category-card {
          display: block;
          padding: 2rem;
          background: var(--bg-color, #ffffff);
          border: 1px solid var(--border-color, #e5e5e5);
          border-radius: 12px;
          text-decoration: none;
          color: inherit;
          transition: all 0.3s ease;
          text-align: center;
        }

        .category-card:hover {
          border-color: #667eea;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        }

        .category-name {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--fg-color, #37352f);
        }

        .category-description {
          color: var(--fg-color-2, #787774);
          line-height: 1.5;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .home-page {
            padding: 1rem;
          }

          .hero-title {
            font-size: 2rem;
          }

          .hero-description {
            font-size: 1rem;
          }

          .posts-grid,
          .categories-grid {
            grid-template-columns: 1fr;
          }

          .section-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </>
  )
} 