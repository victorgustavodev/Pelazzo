import { readFileSync, writeFileSync } from 'node:fs';
// Usa a imagem original, sem redesenhar ou modificar seus pixels.
const png = readFileSync(
  new URL('../frontend/public/brand/pelazzo-logo.png', import.meta.url),
);
const width = png.readUInt32BE(16),
  height = png.readUInt32BE(20);
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="665 95 545 545"><rect x="665" y="95" width="545" height="545" rx="100" fill="white"/><image width="${width}" height="${height}" href="data:image/png;base64,${png.toString('base64')}"/></svg>\n`;
writeFileSync(
  new URL('../frontend/public/favicon.svg', import.meta.url),
  favicon,
);
