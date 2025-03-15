const fs = require('fs');
const path = require('path');

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'src', 'assets', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// List of icon sizes needed for the PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create empty placeholder files for each icon size
iconSizes.forEach(size => {
  const iconPath = path.join(iconsDir, `icon-${size}x${size}.png`);
  fs.writeFileSync(iconPath, '');
  console.log(`Created placeholder icon: ${iconPath}`);
});

console.log('All placeholder icons created successfully!');
