const sharp = require("sharp");
const path = require("path");

const ASSETS = path.join(__dirname, "..", "assets");
const GREEN = "#1B6B4A";
const WHITE = "#FFFFFF";

async function generateIcon() {
  // 1024x1024 app icon — green bg + "GM" centered
  const size = 1024;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="180" fill="${GREEN}"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="central"
          font-family="Arial, Helvetica, sans-serif" font-weight="800"
          font-size="420" fill="${WHITE}" letter-spacing="20">GM</text>
  </svg>`;

  await sharp(Buffer.from(svg)).resize(1024, 1024).png().toFile(path.join(ASSETS, "icon.png"));
  console.log("✅ icon.png (1024x1024)");
}

async function generateAdaptiveIconForeground() {
  // 1024x1024 with safe zone padding (Android adaptive icon foreground)
  // Content should be within the inner 66% (safe zone)
  const size = 1024;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="none"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="central"
          font-family="Arial, Helvetica, sans-serif" font-weight="800"
          font-size="340" fill="${WHITE}" letter-spacing="16">GM</text>
  </svg>`;

  await sharp(Buffer.from(svg)).resize(1024, 1024).png().toFile(path.join(ASSETS, "android-icon-foreground.png"));
  console.log("✅ android-icon-foreground.png (1024x1024)");
}

async function generateAdaptiveIconBackground() {
  // Solid green background for Android adaptive icon
  const size = 1024;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="${GREEN}"/>
  </svg>`;

  await sharp(Buffer.from(svg)).resize(1024, 1024).png().toFile(path.join(ASSETS, "android-icon-background.png"));
  console.log("✅ android-icon-background.png (1024x1024)");
}

async function generateMonochrome() {
  // Monochrome icon: white "GM" on transparent bg
  const size = 1024;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="central"
          font-family="Arial, Helvetica, sans-serif" font-weight="800"
          font-size="340" fill="${WHITE}" letter-spacing="16">GM</text>
  </svg>`;

  await sharp(Buffer.from(svg)).resize(1024, 1024).png().toFile(path.join(ASSETS, "android-icon-monochrome.png"));
  console.log("✅ android-icon-monochrome.png (1024x1024)");
}

async function generateSplashIcon() {
  // Splash icon: "GO MATCH" text on transparent bg (Expo places it on the splash bg color)
  const w = 800;
  const h = 400;
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <text x="50%" y="38%" text-anchor="middle" dominant-baseline="central"
          font-family="Arial, Helvetica, sans-serif" font-weight="900"
          font-size="120" fill="${WHITE}" letter-spacing="12">GO MATCH</text>
    <text x="50%" y="68%" text-anchor="middle" dominant-baseline="central"
          font-family="Arial, Helvetica, sans-serif" font-weight="400"
          font-size="32" fill="rgba(255,255,255,0.7)">Tennis &amp; Padel</text>
  </svg>`;

  await sharp(Buffer.from(svg)).resize(800, 400).png().toFile(path.join(ASSETS, "splash-icon.png"));
  console.log("✅ splash-icon.png (800x400)");
}

async function generateFavicon() {
  // 48x48 favicon
  const size = 48;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="8" fill="${GREEN}"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="central"
          font-family="Arial, Helvetica, sans-serif" font-weight="800"
          font-size="22" fill="${WHITE}" letter-spacing="1">GM</text>
  </svg>`;

  await sharp(Buffer.from(svg)).resize(48, 48).png().toFile(path.join(ASSETS, "favicon.png"));
  console.log("✅ favicon.png (48x48)");
}

(async () => {
  console.log("Generating Go Match branding assets...\n");
  await generateIcon();
  await generateAdaptiveIconForeground();
  await generateAdaptiveIconBackground();
  await generateMonochrome();
  await generateSplashIcon();
  await generateFavicon();
  console.log("\n🎾 All assets generated!");
})();
