import { siteConfig } from './lib/site-config.ts'
import locale from './site.locale.json'

export default siteConfig({
  // the site's root Notion page (required)
  rootNotionPageId: '21df2d475c31807db829ddf5ea90f903',

  // The database id for the blog (required)
  rootNotionDatabaseId: '21df2d475c31812dae49d1b1735e02b4',

  // basic site info (required)
  name: 'Noxionite',
  domain: 'noxionite.vercel.app',
  author: 'Jaewan Shin',

  // open graph metadata (optional)
  description: 'Your Notion pages, reborn as a stunning blog',

  // hero section (optional)
  heroAssets: [
    // {
    //   type: 'image',
    //   src: '/hero-assets/02-1.jpeg',
    //   url: 'https://bit.ly/alemem64',
    //   content: {
    //     ko: {
    //       title: 'Project A',
    //       description: 'Developed an AI-based recommendation system.'
    //     },
    //     en: {
    //       title: 'Project A',
    //       description: 'AI based recommendation system development.'
    //     }
    //   }
    // },
    // {
    //   type: 'video',                                   // 'image' or 'video'
    //   src: '/hero-assets/01-1.mp4',               // Path to the video file in the public folder
    //   url: 'https://bit.ly/alemem64',
    //   content: {
    //     ko: {
    //       title: 'Project A',
    //       description: 'Developed an AI-based recommendation system.'
    //     },
    //     en: {
    //       title: 'Project A',
    //       description: 'AI based recommendation system development.'
    //     }
    //   }
    // },
    // {
    //   type: 'video',
    //   src: '/hero-assets/03-1.mov',
    //   url: 'https://bit.ly/alemem64',
    //   content: {
    //     ko: {
    //       title: 'Project C',
    //       description: 'Created a Next.js blog engine.'
    //     },
    //     en: {
    //       title: 'Project C',
    //       description: 'Next.js blog engine development.'
    //     }
    //   }
    // },
    // {
    //   type: 'image',
    //   src: '/hero-assets/05-1.png',
    //   content: {
    //     ko: {
    //       title: 'Project E',
    //       description: 'Created a Next.js blog engine.'
    //     },
    //     en: {
    //       title: 'Project E',
    //       description: 'Next.js blog engine development.'
    //     }
    //   }
    // },
    {
      type: 'video',
      src: '/hero-assets/04-1.mov',
      url: 'https://bit.ly/alemem64',
      content: {
        ko: {
          title: 'Project D',
          description: 'Created a Next.js blog engine.'
        },
        en: {
          title: 'Project D',
          description: 'Next.js blog engine development.'
        }
      }
    },
  ],

  // author metadata (optional)
  authors: [
    {
      name: 'Jzahnny',                       // Author name
      avatar_dir: '/authors/Jzahnny.jpeg',   // Author avatar image path in public folder (28px x 28px recommended)
      home_url: 'https://bit.ly/alemem64',   // Author home URL
    },
    {
      name: 'Jzahnny2',                      // Multiple author support
      avatar_dir: '/authors/Jzahnny2.png',   // When three is no avatar, it will be hidden
      home_url: 'https://bit.ly/ypjr_n',     
    },
    {
      name: 'Jzahnny3',                      
      avatar_dir: '',                        // Empty string for no avatar
      home_url: '',                          // Empty string for no link
    },
  ],

  // social links, the order is preserved.
  socials: {
    github: 'alemem64',  // optional github username
    linkedin: 'alemem64', // optional linkedin username
    youtube: 'channel/UCV7iVbVip33wD_rsiQLSubg?si=Tf0bKAPvtDY_J833', // optional youtube channel id eg. channel/UCXXXXXXXXXXXXXXXXXXXXXX
    instagram: 'alemem64', // optional instagram username
    // tiktok: '#', // optional tiktok username
    // threads: '#', // optional threads username
    // facebook: '#',  // optional facebook profile id on profile page eg. 1000XXXXXXXXXXX
    // twitter: '#', // optional twitter username
    // mastodon: '#', // optional mastodon profile URL, provides link verification
    // newsletter: '#' // optional personal newsletter URL
  },

  // locale configuration
  locale,

  // Incremental Static Regeneration (ISR) configuration
  isr: {
    revalidate: 60 // revalidate time in seconds
  }
})
