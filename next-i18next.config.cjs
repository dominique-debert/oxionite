const locale = require('./site.locale.json')

module.exports = {
  i18n: {
    defaultLocale: locale.defaultLocale,
    locales: locale.localeList,
  },
  localePath: typeof window === 'undefined' ? require('path').resolve('./public/locales') : '/locales',
  reloadOnPrerender: process.env.NODE_ENV === 'development',
}
