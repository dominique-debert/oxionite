import { getBrowser, renderSocialImage } from './og-images-manager';
import fs from 'node:fs/promises';
import path from 'node:path';
import { SocialCardProps } from '../components/SocialCard';

export interface BatchImageTask {
  props: SocialCardProps;
  imagePath: string;
  publicUrl: string;
}

export async function generateSocialImagesBatch(
  tasks: BatchImageTask[],
  options: {
    batchSize?: number;
    baseUrl?: string;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<{ success: number; failed: number; errors: Array<{ url: string; error: string }> }> {
  const {
    batchSize = 5,
    baseUrl: customBaseUrl,
    onProgress
  } = options;

  if (tasks.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  const baseUrl = customBaseUrl || 
    (process.env.VERCEL ? `https://${process.env.NEXT_PUBLIC_DOMAIN || 'localhost:3000'}` : 'http://localhost:3000');

  const browser = await getBrowser();
  const errors: Array<{ url: string; error: string }> = [];
  let success = 0;
  let failed = 0;

  // Create directories upfront
  const directories = new Set(tasks.map(task => path.dirname(task.imagePath)));
  await Promise.all(
    Array.from(directories).map(dir => fs.mkdir(dir, { recursive: true }))
  );

  // Process in batches
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (task) => {
      try {
        // Check if file already exists
        try {
          await fs.access(task.imagePath);
          return { success: true, url: task.props.url };
        } catch {
          // File doesn't exist, generate it
        }

        const imageBuffer = await renderSocialImage(browser, {
          ...task.props,
          baseUrl
        });
        
        await fs.writeFile(task.imagePath, imageBuffer);
        return { success: true, url: task.props.url };
      } catch (err) {
        return { 
          success: false, 
          url: task.props.url, 
          error: err instanceof Error ? err.message : String(err) 
        };
      }
    });

    const results = await Promise.allSettled(batchPromises);
    
    const batchResults = results.reduce((acc, result) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          acc.success++;
        } else {
          acc.failed++;
          acc.errors.push({ url: result.value.url, error: result.value.error || 'Unknown error' });
        }
      } else {
        acc.failed++;
        acc.errors.push({ url: 'unknown', error: result.reason?.toString() || 'Promise rejected' });
      }
      return acc;
    }, { success: 0, failed: 0, errors: [] as Array<{ url: string; error: string }> });

    success += batchResults.success;
    failed += batchResults.failed;
    errors.push(...batchResults.errors);

    if (onProgress) {
      onProgress(success + failed, tasks.length);
    }
  }

  return { success, failed, errors };
}

// Optimized version for build-time usage
export async function generateSocialImagesOptimized(
  tasks: BatchImageTask[],
  options: {
    batchSize?: number;
    baseUrl?: string;
  } = {}
): Promise<void> {
  const result = await generateSocialImagesBatch(tasks, {
    ...options,
    onProgress: (completed, total) => {
      if (completed % 20 === 0 || completed === total) {
        console.log(`[Batch Generation] Progress: ${completed}/${total} images completed`);
      }
    }
  });

  if (result.errors.length > 0) {
    console.warn(`[Batch Generation] ${result.errors.length} images failed to generate:`);
    result.errors.forEach(error => {
      console.warn(`  - ${error.url}: ${error.error}`);
    });
  }

  console.log(`[Batch Generation] Successfully generated ${result.success} images, ${result.failed} failed`);
}