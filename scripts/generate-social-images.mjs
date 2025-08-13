import { getCachedSiteMap } from '../lib/context/site-cache.ts';
import { generateSocialImage } from '../lib/og-images-manager.ts';
import { buildTagGraphData } from '../lib/context/tag-graph.ts';
import localeConfig from '../site.locale.json' with { type: 'json' };
import path from 'node:path';

async function main() {
  console.log('[Gen Social Images] Starting build-time social image generation...');
  const siteMap = await getCachedSiteMap();
  if (!siteMap) {
    console.error('[Gen Social Images] Failed to get site map. Aborting.');
    return;
  }

  const tagGraphData = buildTagGraphData(siteMap);
  const { localeList, defaultLocale } = localeConfig;

  for (const locale of localeList) {
    console.log(`\n[Gen Social Images] Processing locale: ${locale}`);
    const socialImagesDir = path.join(process.cwd(), 'public', 'social-images', locale);

    // 1. Root page
    try {
      const url = locale === defaultLocale ? '/' : `/${locale}`;
      const imagePath = path.join(socialImagesDir, 'root.png');
      const publicUrl = `/social-images/${locale}/root.png`;
      console.log(`[Gen Social Images] Generating image for root: ${url}`);
      await generateSocialImage(
        { url, siteMap },
        imagePath,
        publicUrl
      );
    } catch (error) {
      console.error(`[Gen Social Images] Failed to generate image for root page in ${locale}:`, error);
    }

    // 2. All-tags page
    try {
      const url = `/${locale}/all-tags`;
      const imagePath = path.join(socialImagesDir, 'all-tags.png');
      const publicUrl = `/social-images/${locale}/all-tags.png`;
      console.log(`[Gen Social Images] Generating image for all-tags: ${url}`);
      await generateSocialImage(
        { url, siteMap },
        imagePath,
        publicUrl
      );
    } catch (error) {
      console.error(`[Gen Social Images] Failed to generate image for all-tags page in ${locale}:`, error);
    }

    // 3. Post pages
    const posts = Object.values(siteMap.pageInfoMap).filter(
      (p) => (p.type === 'Post' || p.type === 'Home') && p.language === locale
    );
    console.log(`[Gen Social Images] Found ${posts.length} posts for locale ${locale}.`);
    for (const page of posts) {
      if (page.slug) {
        try {
          const url = `/${locale}/post/${page.slug}`;
          const imagePath = path.join(socialImagesDir, 'post', `${page.slug}.png`);
          const publicUrl = `/social-images/${locale}/post/${page.slug}.png`;
          console.log(`[Gen Social Images] Generating image for post: ${url}`);
          await generateSocialImage(
            { url, siteMap },
            imagePath,
            publicUrl
          );
        } catch (error) {
          console.error(`[Gen Social Images] Failed to generate image for post ${page.slug} in ${locale}:`, error);
        }
      }
    }

    // 4. Category pages
    const categories = Object.values(siteMap.pageInfoMap).filter(
      (p) => p.type === 'Category' && p.language === locale
    );
    console.log(`[Gen Social Images] Found ${categories.length} categories for locale ${locale}.`);
    for (const page of categories) {
      if (page.slug) {
        try {
          const url = `/${locale}/category/${page.slug}`;
          const imagePath = path.join(socialImagesDir, 'category', `${page.slug}.png`);
          const publicUrl = `/social-images/${locale}/category/${page.slug}.png`;
          console.log(`[Gen Social Images] Generating image for category: ${url}`);
          await generateSocialImage(
            { url, siteMap },
            imagePath,
            publicUrl
          );
        } catch (error) {
          console.error(`[Gen Social Images] Failed to generate image for category ${page.slug} in ${locale}:`, error);
        }
      }
    }

    // 5. Tag pages
    const localeTagData = tagGraphData.locales[locale];
    if (localeTagData && localeTagData.tagCounts) {
      const tags = Object.keys(localeTagData.tagCounts);
      console.log(`[Gen Social Images] Found ${tags.length} tags for locale ${locale}.`);
      for (const tag of tags) {
        try {
          // encodeURIComponent to handle tags with special characters
          const encodedTag = encodeURIComponent(tag);
          const url = `/${locale}/tag/${encodedTag}`;
          const imagePath = path.join(socialImagesDir, 'tag', `${encodedTag}.png`);
          const publicUrl = `/social-images/${locale}/tag/${encodedTag}.png`;
          console.log(`[Gen Social Images] Generating image for tag: ${tag}`);
          await generateSocialImage(
            { url, siteMap },
            imagePath,
            publicUrl
          );
        } catch (error) {
          console.error(`[Gen Social Images] Failed to generate image for tag ${tag} in ${locale}:`, error);
        }
      }
    }
  }

  console.log('[Gen Social Images] Finished generating all social images.');
}

main().catch(console.error);