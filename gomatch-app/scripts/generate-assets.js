const sharp = require("sharp");
const path = require("path");

const ASSETS = path.join(__dirname, "..", "assets");
const NAVY = "#1A3A5C";
const GREEN = "#2E8B57";
const WHITE = "#FFFFFF";

// Crossed rackets SVG path (simplified silhouette)
const RACKETS_SVG = (cx, cy, scale = 1) => `
  <g transform="translate(${cx}, ${cy}) scale(${scale})" fill="none" stroke="${WHITE}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round">
    <!-- Left racket -->
    <ellipse cx="-60" cy="-80" rx="48" ry="64" transform="rotate(-25 -60 -80)"/>
    <line x1="-60" y1="-16" x2="-40" y2="80"/>
    <!-- Right racket -->
    <ellipse cx="60" cy="-80" rx="48" ry="64" transform="rotate(25 60 -80)"/>
    <line x1="60" y1="-16" x2="40" y2="80"/>
  </g>
`;

async function generateIcon() {
  // 1024x1024 app icon — navy bg + crossed rackets + "GM"
  const size = 1024;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="180" fill="${NAVY}"/>
    ${RACKETS_SVG(512, 380, 2.2)}
    <text x="50%" y="82%" text-anchor="middle" dominant-baseline="central"
          font-family="Arial, Helvetica, sans-serif" font-weight="800"
          font-size="200" fill="${WHITE}" letter-spacing="16">GM</text>
  </svg>`;

  await sharp(Buffer.from(svg)).resize(1024, 1024).png().toFile(path.join(ASSETS, "icon.png"));
  console.log("✅ icon.png (1024x1024)");
}

async function generateAdaptiveIconForeground() {
  // 1024x1024 with safe zone padding (Android adaptive icon foreground)
  const size = 1024;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="none"/>
    ${RACKETS_SVG(512, 400, 1.8)}
    <text x="50%" y="80%" text-anchor="middle" dominant-baseline="central"
          font-family="Arial, Helvetica, sans-serif" font-weight="800"
          font-size="160" fill="${WHITE}" letter-spacing="12">GM</text>
  </svg>`;

  await sharp(Buffer.from(svg)).resize(1024, 1024).png().toFile(path.join(ASSETS, "android-icon-foreground.png"));
  console.log("✅ android-icon-foreground.png (1024x1024)");
}

async function generateAdaptiveIconBackground() {
  // Solid navy background for Android adaptive icon
  const size = 1024;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="${NAVY}"/>
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
  // Splash icon: crossed rackets + "GoMatch" + subtitle on transparent bg
  // Expo places this on the splash backgroundColor (#1A3A5C)
  const w = 800;
  const h = 600;
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    ${RACKETS_SVG(400, 200, 1.6)}
    <text x="50%" y="68%" text-anchor="middle" dominant-baseline="central"
          font-family="Arial, Helvetica, sans-serif" font-weight="900"
          font-size="96" fill="${WHITE}" letter-spacing="6">GoMatch</text>
    <text x="50%" y="82%" text-anchor="middle" dominant-baseline="central"
          font-family="Arial, Helvetica, sans-serif" font-weight="400"
          font-size="28" fill="rgba(255,255,255,0.7)">Tennis &amp; Padel</text>
  </svg>`;

  await sharp(Buffer.from(svg)).resize(800, 600).png().toFile(path.join(ASSETS, "splash-icon.png"));
  console.log("✅ splash-icon.png (800x600)");
}

async function generateFavicon() {
  // 48x48 favicon
  const size = 48;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="8" fill="${NAVY}"/>
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
