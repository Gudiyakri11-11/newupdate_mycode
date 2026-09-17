const fs = require('fs');
const os = require('os');
const path = require('path');

const slidePath = path.join(os.tmpdir(), 'template_bb_extract', 'ppt', 'slides', 'slide1.xml');
const content = fs.readFileSync(slidePath, 'utf8');

const shapeRe = /<p:sp>[\s\S]*?<\/p:sp>/g;
const shapes = content.match(shapeRe) || [];
console.log('Total shapes:', shapes.length);

shapes.forEach((s, i) => {
  const idMatch = s.match(/<p:cNvPr id="(\d+)" name="([^"]*)"/);
  const texts = [...s.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
  const xfrmMatch = s.match(/<a:off x="(\d+)" y="(\d+)"\/>/);
  const extMatch = s.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
  console.log(
    i,
    idMatch ? `${idMatch[1]} ${idMatch[2]}` : '??',
    'pos:', xfrmMatch ? `${xfrmMatch[1]},${xfrmMatch[2]}` : '-',
    'size:', extMatch ? `${extMatch[1]}x${extMatch[2]}` : '-',
    JSON.stringify(texts.join('|')),
  );
});
