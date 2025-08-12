// 飞书Plus图标生成脚本
// 在Node.js环境中运行：node generate-icons.js

const fs = require('fs');
const path = require('path');

// 创建SVG图标
function createSVGIcon(size) {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a73e8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1557b0;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.125}"/>
  <text x="${size/2}" y="${size * 0.65}" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" text-anchor="middle" fill="white">F+</text>
</svg>`;
}

// 生成不同尺寸的SVG
const sizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

// 确保icons目录存在
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

sizes.forEach(size => {
  const svg = createSVGIcon(size);
  const filename = path.join(iconsDir, `icon-${size}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`Generated: icon-${size}.svg`);
});

console.log('SVG icons generated successfully!');
console.log('To convert to PNG, use an online SVG to PNG converter or install sharp:');
console.log('npm install sharp');
console.log('Then run the PNG conversion script.');