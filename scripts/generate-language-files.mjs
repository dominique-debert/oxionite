import fs from 'fs/promises';
import path from 'path';

const CWD = process.cwd();

async function generateLanguageFiles() {
  try {
    console.log('🚀 Generating language files...');

    // 1. Read the central language endonyms file
    const endonymsPath = path.join(CWD, 'language-endonyms.json');
    const endonymsContent = await fs.readFile(endonymsPath, 'utf-8');

    // 2. Read site.locale.json to get the list of active locales
    const siteLocalePath = path.join(CWD, 'site.locale.json');
    const siteLocaleContent = await fs.readFile(siteLocalePath, 'utf-8');
    const activeLocales = JSON.parse(siteLocaleContent).localeList;

    console.log(`Active locales: ${activeLocales.join(', ')}`);

    // 3. Write the endonyms to each active locale's languages.json
    for (const locale of activeLocales) {
      const localeDirPath = path.join(CWD, 'public', 'locales', locale);
      const outputFilePath = path.join(localeDirPath, 'languages.json');

      // Ensure the directory exists
      await fs.mkdir(localeDirPath, { recursive: true });

      // Write the file
      await fs.writeFile(outputFilePath, endonymsContent);
      console.log(`✅ Wrote languages.json for [${locale}]`);
    }

    console.log('🎉 Language file generation complete!');
  } catch (error) {
    console.error('❌ Error generating language files:', error);
    process.exit(1);
  }
}

generateLanguageFiles();
