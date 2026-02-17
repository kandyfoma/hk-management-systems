/**
 * HK Management Systems — Icon Generator
 * Generates all required icon sizes for iOS, Android, and Web/PWA
 * from a single 1024x1024 master icon.
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'assets', 'app-icon.png');
const OUTPUT_BASE = path.join(__dirname, '..', 'assets', 'icons');

// ═══════════════════════════════════════════════════════════════
// ICON DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const icons = {
  ios: [
    { size: 20, name: 'icon-20.png' },
    { size: 29, name: 'icon-29.png' },
    { size: 40, name: 'icon-40.png' },
    { size: 58, name: 'icon-58.png' },
    { size: 60, name: 'icon-60.png' },
    { size: 76, name: 'icon-76.png' },
    { size: 80, name: 'icon-80.png' },
    { size: 87, name: 'icon-87.png' },
    { size: 120, name: 'icon-120.png' },
    { size: 152, name: 'icon-152.png' },
    { size: 167, name: 'icon-167.png' },
    { size: 180, name: 'icon-180.png' },
    { size: 1024, name: 'icon-1024.png' },
  ],
  android: [
    { size: 36, name: 'icon-36-ldpi.png' },
    { size: 48, name: 'icon-48-mdpi.png' },
    { size: 72, name: 'icon-72-hdpi.png' },
    { size: 96, name: 'icon-96-xhdpi.png' },
    { size: 144, name: 'icon-144-xxhdpi.png' },
    { size: 192, name: 'icon-192-xxxhdpi.png' },
    { size: 432, name: 'adaptive-icon-432.png' },
    { size: 512, name: 'icon-512-playstore.png' },
  ],
  web: [
    { size: 16, name: 'favicon-16.png' },
    { size: 32, name: 'favicon-32.png' },
    { size: 48, name: 'icon-48.png' },
    { size: 72, name: 'icon-72.png' },
    { size: 96, name: 'icon-96.png' },
    { size: 128, name: 'icon-128.png' },
    { size: 144, name: 'icon-144.png' },
    { size: 152, name: 'icon-152.png' },
    { size: 192, name: 'icon-192.png' },
    { size: 256, name: 'icon-256.png' },
    { size: 384, name: 'icon-384.png' },
    { size: 512, name: 'icon-512.png' },
  ],
};

// Also copy resized versions to root assets for Expo
const expoIcons = [
  { size: 1024, name: 'icon.png' },
  { size: 1024, name: 'adaptive-icon.png' },
  { size: 48, name: 'favicon.png' },
  { size: 1024, name: 'splash-icon.png' },
];

// ═══════════════════════════════════════════════════════════════
// GENERATOR
// ═══════════════════════════════════════════════════════════════

async function generateIcons() {
  console.log('🎨 HK Management Systems — Icon Generator');
  console.log('==========================================\n');

  // Verify source exists
  if (!fs.existsSync(SOURCE)) {
    console.error('❌ Source icon not found:', SOURCE);
    process.exit(1);
  }

  // Get source info
  const metadata = await sharp(SOURCE).metadata();
  console.log(`📁 Source: ${SOURCE}`);
  console.log(`📐 Size: ${metadata.width}x${metadata.height}`);
  console.log(`🎨 Format: ${metadata.format}\n`);

  if (metadata.width < 1024 || metadata.height < 1024) {
    console.warn('⚠️  Warning: Source image is smaller than 1024x1024. Quality may be reduced.\n');
  }

  let totalGenerated = 0;

  // Generate platform icons
  for (const [platform, sizes] of Object.entries(icons)) {
    const outputDir = path.join(OUTPUT_BASE, platform);
    fs.mkdirSync(outputDir, { recursive: true });

    console.log(`\n📱 ${platform.toUpperCase()} Icons (${outputDir})`);
    console.log('─'.repeat(50));

    for (const { size, name } of sizes) {
      const outputPath = path.join(outputDir, name);
      await sharp(SOURCE)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(outputPath);
      console.log(`  ✅ ${name} (${size}x${size})`);
      totalGenerated++;
    }
  }

  // Generate Expo root assets
  const expoDir = path.join(__dirname, '..', 'assets');
  console.log(`\n📦 EXPO Root Assets (${expoDir})`);
  console.log('─'.repeat(50));

  for (const { size, name } of expoIcons) {
    const outputPath = path.join(expoDir, name);
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outputPath);
    console.log(`  ✅ ${name} (${size}x${size})`);
    totalGenerated++;
  }

  console.log(`\n==========================================`);
  console.log(`🎉 Done! Generated ${totalGenerated} icons total.`);
  console.log(`==========================================\n`);
}

generateIcons().catch((err) => {
  console.error('❌ Error generating icons:', err);
  process.exit(1);
});
