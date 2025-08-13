import { getCachedSiteMap } from '../lib/context/site-cache.ts';
import { generateSocialImagesOptimized } from '../lib/og-images-batch.ts';
import { buildTagGraphData } from '../lib/context/tag-graph.ts';
import localeConfig from '../site.locale.json' with { type: 'json' };
import path from 'node:path';
import fs from 'node:fs/promises';

async function main() {
  console.log('[Gen Social Images] Starting optimized build-time social image generation...');
  const startTime = Date.now();
  
  const siteMap = await getCachedSiteMap();
  if (!siteMap) {
    console.error('[Gen Social Images] Failed to get site map. Aborting.');
    return;
  }

  const tagGraphData = buildTagGraphData(siteMap);
  const { localeList, defaultLocale } = localeConfig;

  // Create all necessary directories upfront
  console.log('[Gen Social Images] Pre-creating directories...');
  for (const locale of localeList) {
    const socialImagesDir = path.join(process.cwd(), 'public', 'social-images', locale);
    await fs.mkdir(path.join(socialImagesDir, 'post'), { recursive: true });
    await fs.mkdir(path.join(socialImagesDir, 'category'), { recursive: true });
    await fs.mkdir(path.join(socialImagesDir, 'tag'), { recursive: true });
  }

  // Collect all image generation tasks for parallel processing
  const imageTasks = [];

  for (const locale of localeList) {
    const socialImagesDir = path.join(process.cwd(), 'public', 'social-images', locale);

    // 1. Root page
    const rootUrl = locale === defaultLocale ? '/' : `/${locale}`;
    const rootPath = path.join(socialImagesDir, 'root.png');
    const rootPublicUrl = `/social-images/${locale}/root.png`;
    
    if (!await fileExists(rootPath)) {
      imageTasks.push({
        url: rootUrl,
        imagePath: rootPath,
        publicUrl: rootPublicUrl,
        props: { url: rootUrl, siteMap }
      });
    }

    // 2. All-tags page
    const allTagsUrl = `/${locale}/all-tags`;
    const allTagsPath = path.join(socialImagesDir, 'all-tags.png');
    const allTagsPublicUrl = `/social-images/${locale}/all-tags.png`;
    
    if (!await fileExists(allTagsPath)) {
      imageTasks.push({
        url: allTagsUrl,
        imagePath: allTagsPath,
        publicUrl: allTagsPublicUrl,
        props: { url: allTagsUrl, siteMap }
      });
    }

    // 3. Post pages
    const posts = Object.values(siteMap.pageInfoMap).filter(
      (p) => (p.type === 'Post' || p.type === 'Home') && p.language === locale
    );
    for (const page of posts) {
      if (page.slug) {
        const postUrl = `/${locale}/post/${page.slug}`;
        const postPath = path.join(socialImagesDir, 'post', `${page.slug}.png`);
        const postPublicUrl = `/social-images/${locale}/post/${page.slug}.png`;
        
        if (!await fileExists(postPath)) {
          imageTasks.push({
            url: postUrl,
            imagePath: postPath,
            publicUrl: postPublicUrl,
            props: { url: postUrl, siteMap }
          });
        }
      }
    }

    // 4. Category pages
    const categories = Object.values(siteMap.pageInfoMap).filter(
      (p) => p.type === 'Category' && p.language === locale
    );
    for (const page of categories) {
      if (page.slug) {
        const categoryUrl = `/${locale}/category/${page.slug}`;
        const categoryPath = path.join(socialImagesDir, 'category', `${page.slug}.png`);
        const categoryPublicUrl = `/social-images/${locale}/category/${page.slug}.png`;
        
        if (!await fileExists(categoryPath)) {
          imageTasks.push({
            url: categoryUrl,
            imagePath: categoryPath,
            publicUrl: categoryPublicUrl,
            props: { url: categoryUrl, siteMap }
          });
        }
      }
    }

    // 5. Tag pages
    const localeTagData = tagGraphData.locales[locale];
    if (localeTagData && localeTagData.tagCounts) {
      const tags = Object.keys(localeTagData.tagCounts);
      for (const tag of tags) {
        const encodedTag = encodeURIComponent(tag);
        const tagUrl = `/${locale}/tag/${encodedTag}`;
        const tagPath = path.join(socialImagesDir, 'tag', `${encodedTag}.png`);
        const tagPublicUrl = `/social-images/${locale}/tag/${encodedTag}.png`;
        
        if (!await fileExists(tagPath)) {
          imageTasks.push({
            url: tagUrl,
            imagePath: tagPath,
            publicUrl: tagPublicUrl,
            props: { url: tagUrl, siteMap }
          });
        }
      }
    }
  }

  console.log(`[Gen Social Images] Found ${imageTasks.length} images to generate (skipping existing ones)`);
  
  if (imageTasks.length === 0) {
    console.log('[Gen Social Images] All images already exist. Skipping generation.');
    return;
  }

  // Use the optimized batch processing
  const batchTasks = imageTasks.map(task => ({
    props: task.props,
    imagePath: task.imagePath,
    publicUrl: task.publicUrl
  }));

  console.log(`[Gen Social Images] Processing ${batchTasks.length} images with optimized batch processing`);
  
  await generateSocialImagesOptimized(batchTasks, {
    batchSize: 8, // Increased batch size for better throughput
    baseUrl: process.env.VERCEL ? `https://${siteConfig.domain}` : 'http://localhost:3000'
  });

  const totalTime = Date.now() - startTime;
  console.log(`[Gen Social Images] Finished generating all social images in ${totalTime}ms`);
}

// Helper function to check if file exists
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

main().catch(console.error);