import { getCachedSiteMap } from '../lib/context/site-cache.ts';
import { generateSocialImage } from '../lib/og-images-manager.ts';

async function main() {
  console.log('[Gen Social Images] Starting build-time social image generation...');
  const siteMap = await getCachedSiteMap();
  if (!siteMap) {
    console.error('[Gen Social Images] Failed to get site map. Aborting.');
    return;
  }
  const pages = Object.values(siteMap.pageInfoMap);

  console.log(`[Gen Social Images] Found ${pages.length} pages to process.`);
  console.log(`[Gen Social Images] siteMap.pageInfoMap keys:`, Object.keys(siteMap.pageInfoMap).length);

  for (const page of pages) {
    if (page.slug) {
      console.log(`[Gen Social Images] Generating image for page: ${page.title} (${page.slug})`);
      try {
        await generateSocialImage(page.slug, {
          url: page.slug,
          siteMap: siteMap,
        });
      } catch (error) {
        console.error(`[Gen Social Images] Failed to generate image for ${page.slug}:`, error);
      }
    } else {
      console.log(`[Gen Social Images] Skipping page without slug: ${page.title}`);
    }
  }

  console.log('[Gen Social Images] Finished generating social images.');
}

main().catch(console.error);