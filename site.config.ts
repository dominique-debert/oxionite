import { siteConfig } from './lib/site-config'

export default siteConfig({
  // the site's root Notion page (required)
  rootNotionPageId: '21df2d475c31807db829ddf5ea90f903',

  // The database id for the blog (required)
  rootNotionDatabaseId: '21df2d475c31812dae49d1b1735e02b4',

  // if you want to restrict pages to a single notion workspace (optional)
  // (this should be a Notion ID; see the docs for how to extract this)
  rootNotionSpaceId: null,

  // basic site info (required)
  name: 'Next Notion Blog Engine',
  domain: 'next-notion-blog-engine.vercel.app',
  author: 'NNBE',

  // open graph metadata (optional)
  description: 'Next Notion Blog Engine Example Description',


  // hero section (optional)
  heroAssets: [
    // {
    //   type: 'image',
    //   src: '/hero-assets/02-1.jpeg',
    //   url: 'https://bit.ly/alemem64',
    //   content: {
    //     ko: {
    //       title: 'Project A',
    //       description: 'AI 기반의 추천 시스템을 개발했습니다.'
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
    //       description: 'AI 기반의 추천 시스템을 개발했습니다.'
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
    //       description: 'Next.js 블로그 엔진을 만들었습니다.'
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
    //       description: 'Next.js 블로그 엔진을 만들었습니다.'
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
          description: 'Next.js 블로그 엔진을 만들었습니다.'
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

  // default notion icon and cover images for site-wide consistency (optional)
  // page-specific values will override these site-wide defaults
  defaultPageIcon: null,
  defaultPageCover: null,
  defaultPageCoverPosition: 0.5,

  // whether or not to enable support for LQIP preview images (optional)
  isPreviewImageSupportEnabled: true,

  // whether or not redis is enabled for caching generated preview images (optional)
  // NOTE: if you enable redis, you need to set the `REDIS_HOST` and `REDIS_PASSWORD`
  // environment variables. see the readme for more info
  isRedisEnabled: false,

  // map of notion page IDs to URL paths (optional)
  // any pages defined here will override their default URL paths
  // example:
  //
  // pageUrlOverrides: {
  //   '/foo': '067dd719a912471ea9a3ac10710e7fdf',
  //   '/bar': '0be6efce9daf42688f65c76b89f8eb27'
  // }
  pageUrlOverrides: null,

  // whether to use the default notion navigation style or a custom one with links to
  // important pages. To use `navigationLinks`, set `navigationStyle` to `custom`.
  navigationStyle: 'default',
  // navigationStyle: 'custom',
  // navigationLinks: [
  //   {
  //     title: 'About',
  //     pageId: 'f1199d37579b41cbabfc0b5174f4256a'
  //   },
  //   {
  //     title: 'Contact',
  //     pageId: '6a29ebcb935a4f0689fe661ab5f3b8d1'
  //   }
  // ],

  //   }
  // ],

  // Incremental Static Regeneration (ISR) configuration (optional)
  isr: {
    revalidate: 60 // revalidate time in seconds
  }
})
