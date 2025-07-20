import type * as React from 'react'
import cs from 'classnames'

import * as config from '@/lib/config'
import {
  FaLinkedinIn,
  FaYoutube,
  FaInstagram,
  FaTiktok,
  FaFacebookF,
  FaThreads,
  FaXTwitter,
  FaMastodon,
} from 'react-icons/fa6'
import { TbBrandGithubFilled } from 'react-icons/tb'
import { MdOutgoingMail } from 'react-icons/md'
import styles from 'styles/components/PageSocial.module.css'

type SocialPlatform = 'twitter' | 'github' | 'linkedin' | 'newsletter' | 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'threads' | 'mastodon';

const socialIconMap: Record<SocialPlatform, React.ReactNode> = {
  twitter: <FaXTwitter />,
  github: <TbBrandGithubFilled />,
  linkedin: <FaLinkedinIn />,
  newsletter: <MdOutgoingMail />,
  youtube: <FaYoutube />,
  instagram: <FaInstagram />,
  tiktok: <FaTiktok />,
  facebook: <FaFacebookF />,
  threads: <FaThreads />,
  mastodon: <FaMastodon />
}



const socialLinkMap: Record<SocialPlatform, { href: (id: string) => string; title: (id: string) => string; }> = {
  twitter: {
    href: (username: string) => `https://twitter.com/${username}`,
    title: (username: string) => `Twitter @${username}`
  },
  github: {
    href: (username: string) => `https://github.com/${username}`,
    title: (username: string) => `GitHub @${username}`
  },
  linkedin: {
    href: (username: string) => `https://www.linkedin.com/in/${username}`,
    title: (username: string) => `LinkedIn ${username}`
  },
  newsletter: {
    href: (url: string) => url,
    title: (_: string) => 'Newsletter'
  },
  youtube: {
    href: (id: string) => `https://www.youtube.com/${id}`,
    title: (username: string) => `YouTube ${username}`
  },
  instagram: {
    href: (username: string) => `https://www.instagram.com/${username}`,
    title: (username: string) => `Instagram @${username}`
  },
  tiktok: {
    href: (username: string) => `https://www.tiktok.com/@${username}`,
    title: (username: string) => `TikTok @${username}`
  },
  facebook: {
    href: (id: string) => `https://www.facebook.com/profile.php?id=${id}`,
    title: (username: string) => `Facebook ${username}`
  },
  threads: {
    href: (username: string) => `https://www.threads.net/@${username}`,
    title: (username: string) => `Threads @${username}`
  },
  mastodon: {
    href: (url: string) => url,
    title: (_: string) => 'Mastodon'
  }
}

export const PageSocial: React.FC<{
  className?: string
  header?: boolean
  variant?: 'header' | 'footer'
}> = ({ className, header, variant = 'footer' }) => {
    const socialLinks = Object.entries(config.socials)
    .map(([name, username]) => {
      if (!username || !socialIconMap[name as SocialPlatform]) return null;

      const { href, title } = socialLinkMap[name as SocialPlatform];

      return {
        name,
        href: href(username),
        title: title(username),
        icon: socialIconMap[name as SocialPlatform]
      };
    })
    .filter(Boolean);

  return (
    <div className={cs(styles.pageSocial, header ? styles.header : styles.footer, className)}>
      {socialLinks.map((action) => (
        <a
          className='glass-item'
          href={action.href}
          key={action.name}
          title={action.title}
          target='_blank'
          rel='noopener noreferrer'
        >
          {action.icon}
        </a>
      ))}
    </div>
  )
}
