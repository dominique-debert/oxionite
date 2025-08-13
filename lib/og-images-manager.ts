import type { SiteMap, PageInfo } from './context/types'
import { buildTagGraphData } from './context/tag-graph';

// Interface for SocialCard props - matches SocialCard component
interface SocialCardProps {
  url: string;
  siteMap?: any;
  imageUrl?: string;
  baseUrl?: string;
}

// Dynamic imports for server-side only modules
let puppeteer: any
let chromium: any
let React: any
let ReactDOMServer: any
let fs: any
let path: any
let SocialCard: any
let siteConfig: any
let localeConfig: any

// Lazy load server-side modules
async function loadServerModules() {
  if (!puppeteer) {
    puppeteer = (await import('puppeteer')).default
  }
  if (!chromium) {
    try {
      chromium = (await import('@sparticuz/chromium')).default
    } catch {
      // Fallback for environments without chromium
      chromium = null
    }
  }
  if (!React) {
    React = await import('react')
  }
  if (!ReactDOMServer) {
    ReactDOMServer = await import('react-dom/server')
  }
  if (!fs) {
    fs = await import('node:fs/promises')
  }
  if (!path) {
    // eslint-disable-next-line unicorn/import-style
    path = await import('node:path')
  }
  if (!SocialCard) {
    const mod = await import('../components/SocialCard')
    SocialCard = mod.SocialCard
  }
  if (!siteConfig) {
    siteConfig = (await import('../site.config.ts')).default
  }
  if (!localeConfig) {
    localeConfig = (await import('../site.locale.json')).default
  }
}

// Browser instance cache for reuse
let cachedBrowser: any | null = null
let browserPromise: Promise<any> | null = null

// Get or create browser instance
export async function getBrowser(): Promise<any> {
  if (cachedBrowser && cachedBrowser.isConnected()) {
    console.log('[getBrowser] Reusing cached browser')
    return cachedBrowser
  }

  if (browserPromise) {
    console.log('[getBrowser] Awaiting existing browser promise')
    return browserPromise
  }

  console.log('[getBrowser] Creating new browser instance')
  
  const _launchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-plugins',
    ]
  }

  try {
    // Check environment - skip Chromium for local development
    const isProductionServerless = (process.env.VERCEL === '1' || process.env.NETLIFY === 'true') && 
                                  process.env.NODE_ENV === 'production';
    
    if (isProductionServerless && chromium) {
      console.log('[getBrowser] Using Chromium for serverless production')
      const executablePath = await chromium.executablePath()
      browserPromise = puppeteer.launch({
        headless: true,
        args: chromium.args || [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-plugins',
        ],
        executablePath,
      })
    } else {
      console.log('[getBrowser] Using local Puppeteer - bundled browser')
      // For local development, use the browser bundled with the puppeteer package.
      browserPromise = puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-plugins',
        ],
        executablePath: puppeteer.executablePath(),
      })
    }

    const browser = await browserPromise
    if (!browser) {
      throw new Error('Failed to launch browser')
    }
    cachedBrowser = browser
    console.log('[getBrowser] Browser launched successfully')
    return browser
  } catch (err) {
    console.error('[getBrowser] Failed to launch browser:', err)
    console.error('[getBrowser] Error details:', {
      code: (err as NodeJS.ErrnoException).code,
      errno: (err as NodeJS.ErrnoException).errno,
      syscall: (err as NodeJS.ErrnoException).syscall,
      message: (err as Error).message
    });
    
    // Provide helpful error message for ENOEXEC
    if ((err as NodeJS.ErrnoException).code === 'ENOEXEC') {
      console.error('[getBrowser] ENOEXEC: This usually means the browser executable is not compatible with your system')
      console.error('[getBrowser] For local development, ensure Chrome/Chromium is installed and accessible')
      console.error('[getBrowser] Try: npm install puppeteer --save-dev')
    }
    
    browserPromise = null
    throw err
  } finally {
    browserPromise = null
  }
}

// Internal core rendering function
export async function renderSocialImage(
  browser: any,
  props: any
): Promise<Buffer> {
  if (!browser.isConnected()) {
    throw new Error('Browser is not connected.')
  }

  const page = await browser.newPage()

  // Optimize: Disable unnecessary features for faster rendering
  await page.setRequestInterception(true).catch(() => {
    // Ignore if interception fails
  });
  
  
  page.on('request', (request: any) => {
    const resourceType = request.resourceType();
    const url = request.url();
    
    // Allow documents and images (including external domains)
    if (resourceType === 'document' || resourceType === 'image') {
      request.continue().catch(() => {
        // Ignore continue errors
      });
    } else {
      // Allow fonts and stylesheets for better rendering
      const allowedExtensions = ['.css', '.woff', '.woff2', '.ttf', '.otf'];
      const hasAllowedExtension = allowedExtensions.some(ext => url.toLowerCase().includes(ext));
      if (hasAllowedExtension) {
        request.continue().catch(() => {
          // Ignore continue errors
        });
      } else {
        request.abort().catch(() => {
          // Ignore abort errors
        });
      }
    }
  });

  try {
    await page.setViewport({ width: 1200, height: 630 })
    
    const baseUrl = props.baseUrl || `https://${siteConfig.domain}`;
    
    // Generate HTML once and reuse
    const element = React.createElement(SocialCard, props)
    const html = ReactDOMServer.renderToStaticMarkup(element)
    
    // Optimized HTML with base URL injected directly
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <base href="${baseUrl}">
          <meta charset="utf-8">
          <style>
            body { margin: 0; padding: 0; }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    await page.setContent(fullHtml, {
      waitUntil: 'networkidle0', // Wait for network to be idle for external images
      timeout: 10_000 // Increased timeout for external image loading
    })

    // Wait for all images to load
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve, _reject) => {
            img.addEventListener('load', resolve);
            img.addEventListener('error', resolve); // Resolve on error to prevent hanging
            setTimeout(resolve, 3000); // Timeout after 3 seconds
          });
        })
      );
    });

    // Minimal wait for fonts only if needed
    try {
      await page.evaluateHandle('document.fonts.ready').catch(() => {
        // Continue if fonts fail to load
      });
    } catch {
      // Continue if fonts fail to load
    }
    
    // Brief wait for any remaining rendering
    await new Promise(resolve => setTimeout(resolve, 500));

    const screenshotData = await page.screenshot({ 
      type: 'jpeg',
      quality: 70,
      omitBackground: false
    })
    
    if (!screenshotData) {
      throw new Error('Failed to create screenshot')
    }
    return Buffer.from(screenshotData)
  } finally {
    await page.close()
  }
}


// Exported function for file system generation (ISR/build-time)
export async function generateSocialImage(
  props: any,
  imagePath: string,
  publicUrl: string
): Promise<string> {
  await loadServerModules();
  
  const socialImagesDir = path.dirname(imagePath);

  try {
    // Use fs.mkdir to create parent directories
    await fs.mkdir(socialImagesDir, { recursive: true });
    // Check if file exists
    await fs.access(imagePath);
    return publicUrl;
  } catch {
    // File doesn't exist, so we'll generate it.
  }

  try {
    const browser = await getBrowser();
    // Base URL for resolving assets inside Puppeteer
    const baseUrl = process.env.VERCEL ? `https://${siteConfig.domain}` : 'http://localhost:3000';

    const imageBuffer = await renderSocialImage(browser, {
      ...props,
      baseUrl
    });
    
    await fs.writeFile(imagePath, imageBuffer);
    return publicUrl;
  } catch (err) {
    console.error(`[SocialImage] Failed to generate image for URL '${props.url}':`, err);
    throw err;
  }
}

// Social Image Manager for ISR updates
export class SocialImageManager {
  private previousSiteMap: SiteMap | null = null;
  private previousTagGraph: any = null;

  constructor() {
    void this.loadPreviousState();
  }

  private async loadPreviousState() {
    await loadServerModules();
    
    try {
      const statePath = path.join(process.cwd(), '.next', 'social-images-state.json');
      console.log(`[SocialImageManager] Loading previous state from: ${statePath}`);
      
      try {
        await fs.access(statePath);
        console.log('[SocialImageManager] State file exists');
      } catch {
        console.log('[SocialImageManager] State file does not exist (first run)');
        this.previousSiteMap = null;
        this.previousTagGraph = null;
        return;
      }
      
      const stateData = await fs.readFile(statePath, 'utf8');
      const state = JSON.parse(stateData);
      this.previousSiteMap = state.siteMap;
      this.previousTagGraph = state.tagGraph;
      console.log('[SocialImageManager] Previous state loaded:', {
        pages: Object.keys(this.previousSiteMap?.pageInfoMap || {}).length,
        tags: Object.keys(this.previousTagGraph?.locales || {}).length,
        lastUpdated: new Date(state.lastUpdated).toISOString()
      });
    } catch (err) {
      console.error('[SocialImageManager] Failed to load previous state:', err);
      this.previousSiteMap = null;
      this.previousTagGraph = null;
    }
  }

  private async saveState(siteMap: SiteMap, tagGraph: any) {
    await loadServerModules();
    
    try {
      const statePath = path.join(process.cwd(), '.next', 'social-images-state.json');
      console.log(`[SocialImageManager] Saving state to: ${statePath}`);
      const stateDir = path.dirname(statePath);
      await fs.mkdir(stateDir, { recursive: true });
      
      const stateData = {
        siteMap,
        tagGraph,
        lastUpdated: Date.now()
      };
      
      await fs.writeFile(statePath, JSON.stringify(stateData, null, 2));
      console.log('[SocialImageManager] State saved successfully:', {
        pages: Object.keys(siteMap?.pageInfoMap || {}).length,
        tags: Object.keys(tagGraph?.locales || {}).length,
        lastUpdated: new Date(stateData.lastUpdated).toISOString()
      });
    } catch (err) {
      console.error('[SocialImageManager] Failed to save state:', err);
    }
  }

  private generateImageKey(pageInfo: PageInfo): string {
    return `${pageInfo.type}-${pageInfo.language}-${pageInfo.slug || pageInfo.pageId || ''}`;
  }

  private hasPageChanged(oldPage: PageInfo | undefined, newPage: PageInfo): boolean {
    if (!oldPage) {
      console.log(`[SocialImageManager] Page ${newPage.pageId} is new, will generate image`);
      return true;
    }
    
    const relevantFields = [
      'title', 'type', 'language', 'public', 'date', 
      'tags', 'authors', 'breadcrumb', 'coverImage'
    ];
    
    const changedFields: string[] = [];
    
    const hasChanged = relevantFields.some(field => {
      const oldValue = (oldPage as any)[field];
      const newValue = (newPage as any)[field];
      const changed = JSON.stringify(oldValue) !== JSON.stringify(newValue);
      if (changed) {
        changedFields.push(`${field}: '${oldValue}' → '${newValue}'`);
      }
      return changed;
    });
    
    if (hasChanged) {
      console.log(`[SocialImageManager] Page ${newPage.pageId} (${newPage.title}) has changes:`, changedFields.join(', '));
    } else {
      console.log(`[SocialImageManager] Page ${newPage.pageId} (${newPage.title}) has no changes, skipping`);
    }
    
    return hasChanged;
  }

  private async deleteImage(imagePath: string) {
    await loadServerModules();
    
    try {
      await fs.unlink(imagePath);
      console.log(`[SocialImageManager] Deleted image: ${imagePath}`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`[SocialImageManager] Failed to delete image: ${imagePath}`, err);
      }
    }
  }

  private async cleanupOrphanedFiles(siteMap: SiteMap, tagGraph: any): Promise<void> {
    console.log('[SocialImageManager] Starting proactive cleanup of orphaned files...');
    
    const { localeList } = localeConfig;
    const baseDir = path.join(process.cwd(), 'public', 'social-images');
    
    for (const locale of localeList) {
      await this.cleanupOrphanedFilesForLocale(siteMap, tagGraph, locale, baseDir);
    }
    
    console.log('[SocialImageManager] Proactive cleanup completed');
  }

  private async cleanupOrphanedFilesForLocale(siteMap: SiteMap, tagGraph: any, locale: string, baseDir: string): Promise<void> {
    const localeDir = path.join(baseDir, locale);
    
    try {
      // Get current valid pages and tags for this locale
      const validPages = this.getValidPagesForLocale(siteMap, locale);
      const validTags = this.getValidTagsForLocale(tagGraph, locale);
      
      // Cleanup post/category files
      await this.cleanupDirectory(path.join(localeDir, 'post'), validPages.posts);
      await this.cleanupDirectory(path.join(localeDir, 'category'), validPages.categories);
      
      // Cleanup tag files
      await this.cleanupDirectory(path.join(localeDir, 'tag'), validTags);
      
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        console.error(`[SocialImageManager] Error during cleanup for locale ${locale}:`, err);
      }
    }
  }

  private getValidPagesForLocale(siteMap: SiteMap, locale: string): { posts: Set<string>, categories: Set<string> } {
    const posts = new Set<string>();
    const categories = new Set<string>();
    
    for (const [_pageId, page] of Object.entries(siteMap.pageInfoMap || {})) {
      if (page.language === locale && page.slug) {
        const filename = `${page.slug}.jpg`;
        if (page.type === 'Post' || page.type === 'Home') {
          posts.add(filename);
        } else if (page.type === 'Category') {
          categories.add(filename);
        }
      }
    }
    
    return { posts, categories };
  }

  private getValidTagsForLocale(tagGraph: any, locale: string): Set<string> {
    const validTags = new Set<string>();
    const localeTags = tagGraph?.locales?.[locale]?.tagCounts || {};
    
    for (const tag of Object.keys(localeTags)) {
      validTags.add(`${encodeURIComponent(tag)}.jpg`);
    }
    
    return validTags;
  }

  private async cleanupDirectory(dirPath: string, validFiles: Set<string>): Promise<void> {
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        if (file.endsWith('.jpg') && !validFiles.has(file)) {
          const filePath = path.join(dirPath, file);
          console.log(`[SocialImageManager] Deleting orphaned file: ${filePath}`);
          await this.deleteImage(filePath);
        }
      }
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        console.error(`[SocialImageManager] Error reading directory ${dirPath}:`, err);
      }
    }
  }

  private async deleteTagImages(removedTags: string[], locale: string) {
    const socialImagesDir = path.join(process.cwd(), 'public', 'social-images', locale, 'tag');
    
    for (const tag of removedTags) {
      const encodedTag = encodeURIComponent(tag);
      const imagePath = path.join(socialImagesDir, `${encodedTag}.jpg`);
      await this.deleteImage(imagePath).catch(err => {
        console.error(`[SocialImageManager] Failed to delete image: ${imagePath}`, err);
      });
    }
  }

  private async deletePageImages(removedPages: PageInfo[]) {
    for (const page of removedPages) {
      const slugStr = page.slug;
      if (!slugStr) continue;
      
      const baseDir = path.join(process.cwd(), 'public', 'social-images', String(page.language));
      const filename = String(slugStr) + '.jpg';
      let imagePath: string;
      
      switch (page.type) {
        case 'Post':
        case 'Home':
          imagePath = path.join(baseDir, 'post', String(filename));
          break;
        case 'Category':
          imagePath = path.join(baseDir, 'category', String(filename));
          break;
        default:
          continue;
      }
      
      await this.deleteImage(imagePath).catch(err => {
        console.error(`[SocialImageManager] Failed to delete image: ${imagePath}`, err);
      });
    }
  }

  async syncSocialImages(siteMap: SiteMap, tagGraph: any) {
    console.log('[SocialImageManager] Starting social image sync...');
    console.log('[SocialImageManager] Previous site map exists:', !!this.previousSiteMap);
    
    // Force regeneration for testing - check if we're in development
    const forceRegenerate = process.env.NODE_ENV === 'development';
    if (forceRegenerate) {
      console.log('[SocialImageManager] Development mode - forcing regeneration of all images');
    }
    
    if (!this.previousSiteMap && !forceRegenerate) {
      // First run, skip processing (build-time handles this)
      await this.saveState(siteMap, tagGraph);
      console.log('[SocialImageManager] First run, skipping incremental update');
      return;
    }

    const { localeList } = localeConfig;
    const tasks: Array<{
      url: string;
      imagePath: string;
      publicUrl: string;
      props: SocialCardProps;
    }> = [];

    const pagesToUpdate: PageInfo[] = [];
    const pagesToDelete: PageInfo[] = [];
    const tagsToAdd: string[] = [];
    const tagsToDelete: Record<string, string[]> = {};

    // Initialize tagsToDelete for each locale
    for (const locale of localeList) {
      tagsToDelete[locale] = [];
    }

    // Compare pages
    const oldPages = this.previousSiteMap?.pageInfoMap || {};
    const newPages = siteMap.pageInfoMap || {};
    
    console.log(`[SocialImageManager] Comparing ${Object.keys(oldPages).length} old pages with ${Object.keys(newPages).length} new pages`);

    for (const [pageId, newPage] of Object.entries(newPages)) {
      const oldPage = oldPages[pageId];
      
      if (forceRegenerate || !oldPage || this.hasPageChanged(oldPage, newPage)) {
        if (newPage.slug && (newPage.type === 'Post' || newPage.type === 'Home' || newPage.type === 'Category')) {
          if (forceRegenerate) {
            console.log(`[SocialImageManager] Force adding page: ${newPage.title} (${pageId})`);
          } else {
            console.log(`[SocialImageManager] Adding page to update: ${newPage.title} (${pageId})`);
          }
          pagesToUpdate.push(newPage);
        } else {
          console.log(`[SocialImageManager] Skipping page (no slug or wrong type): ${newPage.title} (${pageId})`);
        }
      }
    }

    // Find removed pages
    for (const [pageId, oldPage] of Object.entries(oldPages)) {
      if (!newPages[pageId]) {
        console.log(`[SocialImageManager] Page removed: ${oldPage.title} (${pageId})`);
        pagesToDelete.push(oldPage);
      }
    }

    // Compare tags
    console.log('[SocialImageManager] Comparing tags across locales:', localeList);
    for (const locale of localeList) {
      const oldTags = this.previousTagGraph?.locales?.[locale]?.tagCounts || {};
      const newTags = tagGraph?.locales?.[locale]?.tagCounts || {};
      
      console.log(`[SocialImageManager] Locale ${locale}: ${Object.keys(oldTags).length} old tags, ${Object.keys(newTags).length} new tags`);

      // Find new tags
      for (const tag of Object.keys(newTags)) {
        if (forceRegenerate || !oldTags[tag]) {
          if (forceRegenerate) {
            console.log(`[SocialImageManager] Force adding tag: ${tag} in ${locale}`);
          } else {
            console.log(`[SocialImageManager] New tag found: ${tag} in ${locale}`);
          }
          tagsToAdd.push(tag);
        }
      }

      // Find removed tags
      for (const tag of Object.keys(oldTags)) {
        if (!newTags[tag]) {
          console.log(`[SocialImageManager] Tag removed: ${tag} from ${locale}`);
          tagsToDelete[locale].push(tag);
        }
      }
    }

    // Delete existing images for pages being updated
    console.log(`[SocialImageManager] Deleting existing images for ${pagesToUpdate.length} pages to update`);
    for (const page of pagesToUpdate) {
      const slugStr = page.slug;
      const langStr = page.language;
      if (!slugStr || !langStr) {
        console.log(`[SocialImageManager] Skipping page ${page.title} - missing slug or language`);
        continue;
      }

      const baseDir = path.join(process.cwd(), 'public', 'social-images', String(langStr));
      const filename = String(slugStr) + '.jpg';
      let imagePath: string;
      
      switch (page.type) {
        case 'Post':
        case 'Home':
          imagePath = path.join(baseDir, 'post', String(filename));
          break;
        case 'Category':
          imagePath = path.join(baseDir, 'category', String(filename));
          break;
        default:
          continue;
      }
      
      console.log(`[SocialImageManager] Deleting existing image: ${imagePath}`);
      await this.deleteImage(imagePath).catch(err => {
        console.error(`[SocialImageManager] Failed to delete image: ${imagePath}`, err);
      });
    }

    // Generate tasks for updated/new pages
    console.log(`[SocialImageManager] Generating tasks for ${pagesToUpdate.length} pages to update`);
    for (const page of pagesToUpdate) {
      const slugStr = page.slug;
      const langStr = page.language;
      if (!slugStr || !langStr) {
        console.log(`[SocialImageManager] Skipping page ${page.title} - missing slug or language`);
        continue;
      }

      const baseUrl = '/' + String(langStr);
      const socialImagesDir = path.join(process.cwd(), 'public', 'social-images', String(langStr));

      let url: string;
      let imagePath: string;
      let publicUrl: string;

      if (page.type === 'Post' || page.type === 'Home') {
        const filename = String(slugStr) + '.jpg';
        url = baseUrl + '/post/' + String(slugStr);
        imagePath = path.join(socialImagesDir, 'post', String(filename));
        publicUrl = '/social-images/' + String(langStr) + '/post/' + String(filename);
      } else if (page.type === 'Category') {
        const filename = String(slugStr) + '.jpg';
        url = baseUrl + '/category/' + String(slugStr);
        imagePath = path.join(socialImagesDir, 'category', String(filename));
        publicUrl = '/social-images/' + String(langStr) + '/category/' + String(filename);
      } else {
        console.log(`[SocialImageManager] Skipping page ${page.title} - unsupported type: ${page.type}`);
        continue;
      }

      console.log(`[SocialImageManager] Adding task: ${page.title}`);
      console.log(`  - URL: ${url}`);
      console.log(`  - Image Path: ${imagePath}`);
      console.log(`  - Public URL: ${publicUrl}`);

      tasks.push({
            url,
            imagePath,
            publicUrl,
            props: {
              url,
              siteMap,
              baseUrl: `https://${siteConfig.domain}`
            }
          });
    }

    // Delete existing images for tags being updated
    console.log(`[SocialImageManager] Deleting existing images for ${tagsToAdd.length} tags to update`);
    for (const locale of localeList) {
      const localeTags = tagGraph?.locales?.[locale]?.tagCounts || {};
      
      for (const tag of tagsToAdd) {
        if (localeTags[tag]) {
          const encodedTag = encodeURIComponent(tag);
          const imagePath = path.join(process.cwd(), 'public', 'social-images', locale, 'tag', `${encodedTag}.jpg`);
          
          console.log(`[SocialImageManager] Deleting existing tag image: ${imagePath}`);
          await this.deleteImage(imagePath).catch(err => {
            console.error(`[SocialImageManager] Failed to delete tag image: ${imagePath}`, err);
          });
        }
      }
    }

    // Generate tasks for new tags
    console.log(`[SocialImageManager] Generating tasks for ${tagsToAdd.length} new tags`);
    for (const locale of localeList) {
      const localeTags = tagGraph?.locales?.[locale]?.tagCounts || {};
      
      for (const tag of tagsToAdd) {
        if (localeTags[tag]) {
          const encodedTag = encodeURIComponent(tag);
          const url = `/${locale}/tag/${encodedTag}`;
          const imagePath = path.join(process.cwd(), 'public', 'social-images', locale, 'tag', `${encodedTag}.jpg`);
          const publicUrl = `/social-images/${locale}/tag/${encodedTag}.jpg`;

          console.log(`[SocialImageManager] Adding tag task: ${tag} in ${locale}`);
          console.log(`  - URL: ${url}`);
          console.log(`  - Image Path: ${imagePath}`);
          console.log(`  - Public URL: ${publicUrl}`);

          tasks.push({
            url,
            imagePath,
            publicUrl,
            props: {
              url,
              siteMap,
              baseUrl: `https://${siteConfig.domain}`
            }
          });
        } else {
          console.log(`[SocialImageManager] Skipping tag ${tag} in ${locale} - not found in localeTags`);
        }
      }
    }

    // Delete removed images
    await this.deletePageImages(pagesToDelete).catch(err => {
      console.error('[SocialImageManager] Failed to delete page images:', err);
    });
    for (const locale of localeList) {
      console.log(`[SocialImageManager] Deleting ${tagsToDelete[locale].length} removed tags for locale ${locale}`);
      await this.deleteTagImages(tagsToDelete[locale], locale).catch(err => {
        console.error(`[SocialImageManager] Failed to delete tag images for locale ${locale}:`, err);
      });
    }

    // Generate new/updated images
    if (tasks.length > 0) {
      console.log(`[SocialImageManager] Processing ${tasks.length} image updates...`);
      console.log('[SocialImageManager] Tasks to process:', tasks.map(t => ({
        url: t.url,
        imagePath: t.imagePath,
        type: t.url.includes('/tag/') ? 'tag' : 'page'
      })));
      
      const { generateSocialImagesOptimized } = await import('./og-images-batch');
      await generateSocialImagesOptimized(tasks, {
        batchSize: 8,
        baseUrl: process.env.VERCEL ? `https://${siteConfig.domain}` : 'http://localhost:3000'
      });
    } else {
      console.log('[SocialImageManager] No tasks to process - all images are up to date');
    }

    // Update state
    await this.saveState(siteMap, tagGraph);
    
    console.log('[SocialImageManager] Sync completed:', {
      pagesUpdated: pagesToUpdate.length,
      pagesUpdatedDetails: pagesToUpdate.map(p => ({id: p.pageId, title: p.title, type: p.type})),
      pagesDeleted: pagesToDelete.length,
      pagesDeletedDetails: pagesToDelete.map(p => ({id: p.pageId, title: p.title, type: p.type})),
      tagsAdded: tagsToAdd.length,
      tagsAddedDetails: tagsToAdd,
      tagsDeleted: tagsToDelete.length,
      tagsDeletedDetails: tagsToDelete,
      imagesGenerated: tasks.length
    });
  }
}

// Global instance
export const socialImageManager = new SocialImageManager();

// Social image sync functions (integrated from social-image-sync.ts)

let isSyncing = false;

export async function syncSocialImagesWithSiteMap(siteMap: SiteMap) {
  if (isSyncing) {
    console.log('[SocialImageSync] Sync already in progress, skipping...');
    return;
  }

  isSyncing = true;
  
  try {
    console.log('[SocialImageSync] Starting social image sync with site map...');
    
    const tagGraphData = buildTagGraphData(siteMap);
    await socialImageManager.syncSocialImages(siteMap, tagGraphData);
    
    console.log('[SocialImageSync] Social image sync completed successfully');
  } catch (err) {
    console.error('[SocialImageSync] Error during social image sync:', err);
  } finally {
    isSyncing = false;
  }
}

// Hook to integrate with site-cache ISR updates
export function setupSocialImageSync() {
  // This will be called from site-cache.ts after site map updates
  console.log('[SocialImageSync] Social image sync system initialized');
}