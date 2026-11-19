import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const FONT_DIR = path.resolve(process.cwd(), 'public/fonts');
if (!fs.existsSync(FONT_DIR)) {
  fs.mkdirSync(FONT_DIR, { recursive: true });
}

// URLs from Google Fonts GitHub repo raw files for Noto Sans & Noto Serif
const FONTS = [
  {
    name: 'NotoSans-Regular.ttf',
    url: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf',
  },
  {
    name: 'NotoSans-Bold.ttf',
    url: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf',
  },
  {
    name: 'NotoSans-Italic.ttf',
    url: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Italic.ttf',
  },
  {
    name: 'NotoSans-BoldItalic.ttf',
    url: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-BoldItalic.ttf',
  },
  {
    name: 'NotoSerif-Regular.ttf',
    url: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSerif/NotoSerif-Regular.ttf',
  },
  {
    name: 'NotoSerif-Bold.ttf',
    url: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSerif/NotoSerif-Bold.ttf',
  },
  {
    name: 'NotoSerif-Italic.ttf',
    url: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSerif/NotoSerif-Italic.ttf',
  },
  {
    name: 'NotoSerif-BoldItalic.ttf',
    url: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSerif/NotoSerif-BoldItalic.ttf',
  },
  {
    name: 'OFL.txt',
    url: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/LICENSE',
  },
];

async function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    function get(currentUrl: string) {
      https.get(currentUrl, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download ${url}: status ${res.statusCode}`));
          return;
        }
        const fileStream = fs.createWriteStream(dest);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    }
    get(url);
  });
}

async function main() {
  for (const font of FONTS) {
    const dest = path.join(FONT_DIR, font.name);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      console.log(`Already exists: ${font.name} (${fs.statSync(dest).size} bytes)`);
      continue;
    }
    console.log(`Downloading ${font.name}...`);
    try {
      await download(font.url, dest);
      console.log(`Saved ${font.name} (${fs.statSync(dest).size} bytes)`);
    } catch (err) {
      console.error(`Error downloading ${font.name}:`, err);
    }
  }
}

main();
