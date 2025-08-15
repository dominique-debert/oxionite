import { getCachedSiteMap } from '../lib/context/site-cache.ts';
import { generateSocialImagesOptimized } from '../lib/og-images-batch.ts';
import { buildTagGraphData } from '../lib/context/tag-graph.ts';
import localeConfig from '../site.locale.json' with { type: 'json' };
import path from 'node:path';
import fs from 'node:fs/promises';
import http from 'node:http';
import handler from 'serve-handler';

async function main() {
  
  const startTime = Date.now();
  
  const siteMap = await getCachedSiteMap();
  if (!siteMap) {
    console.error('[Gen Social Images] Failed to get site map. Aborting.');
    return;
  }

  const tagGraphData = buildTagGraphData(siteMap);
  const { localeList, defaultLocale } = localeConfig;

  // Create all necessary directories upfront

  const socialImagesRootDir = path.join(process.cwd(), 'public', 'social-images');
  await fs.mkdir(socialImagesRootDir, { recursive: true });
  
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

    // 1. Root page - only generate once for the default locale
    if (locale === defaultLocale) {
      const rootUrl = '/';
      const rootPath = path.join(process.cwd(), 'public', 'social-images', 'root.jpg');
      const rootPublicUrl = '/social-images/root.jpg';
      
      if (!await fileExists(rootPath)) {
        imageTasks.push({
          url: rootUrl,
          imagePath: rootPath,
          publicUrl: rootPublicUrl,
          props: { url: rootUrl, siteMap }
        });
      }
    }

    // 2. All-tags page
    const allTagsUrl = `/${locale}/all-tags`;
    const allTagsPath = path.join(socialImagesDir, 'all-tags.jpg');
    const allTagsPublicUrl = `/social-images/${locale}/all-tags.jpg`;
    
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
        const postPath = path.join(socialImagesDir, 'post', `${page.slug}.jpg`);
        const postPublicUrl = `/social-images/${locale}/post/${page.slug}.jpg`;
        
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
        const categoryPath = path.join(socialImagesDir, 'category', `${page.slug}.jpg`);
        const categoryPublicUrl = `/social-images/${locale}/category/${page.slug}.jpg`;
        
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
        const tagPath = path.join(socialImagesDir, 'tag', `${encodedTag}.jpg`);
        const tagPublicUrl = `/social-images/${locale}/tag/${encodedTag}.jpg`;
        
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


  
  if (imageTasks.length === 0) {

    return;
  }

  // Use the optimized batch processing
  const batchTasks = imageTasks.map(task => ({
    props: task.props,
    imagePath: task.imagePath,
    publicUrl: task.publicUrl
  }));


  
  // Start local server for serving public assets during build
  let baseUrl;
  let server;
  
  if (process.env.VERCEL) {
    // For Vercel deployment, use the actual domain
    baseUrl = 'https://noxionite.vercel.app';
  } else {
    const buildServer = await createBuildServer();
    server = buildServer.server;
    baseUrl = buildServer.baseUrl;
  }

  try {
    await generateSocialImagesOptimized(batchTasks, {
      batchSize: 8, // Increased batch size for better throughput
      baseUrl: baseUrl
    });

    const totalTime = Date.now() - startTime;
  
  } finally {
    // Clean up server
    if (server) {
      server.close();
    
    }
  }
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

// Create a simple HTTP server to serve public folder during build
async function createBuildServer() {
  const server = http.createServer((request, response) => {
    return handler(request, response, {
      public: path.join(process.cwd(), 'public'),
      cleanUrls: false,
    });
  });

  return new Promise((resolve) => {
    server.listen(0, () => {
      const port = server.address().port;
      const baseUrl = `http://localhost:${port}`;
    
      resolve({ server, baseUrl });
    });
  });
}

main().catch(console.error);