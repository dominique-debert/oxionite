const { siteConfig } = require('./lib/site-config')

module.exports = {
  i18n: {
    defaultLocale: siteConfig.locale.localeList[0],
    locales: siteConfig.locale.localeList,
  },
  localePath: typeof window === 'undefined' ? require('path').resolve('./public/locales') : '/locales',
  reloadOnPrerender: process.env.NODE_ENV === 'development',
}
