const fs = require("fs");
const path = require("path");
const QRCode = require("../node_modules/qrcode-terminal/vendor/QRCode");
const QRErrorCorrectLevel = require("../node_modules/qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel");

const text = process.argv[2];
if (!text) {
  console.error("Usage: node scripts/generate-expo-qr.js <expo-url>");
  process.exit(1);
}

const qr = new QRCode(-1, QRErrorCorrectLevel.L);
qr.addData(text);
qr.make();

const scale = 10;
const padding = 4;
const moduleCount = qr.getModuleCount();
const size = (moduleCount + padding * 2) * scale;

let modules = "";
for (let y = 0; y < moduleCount; y += 1) {
  for (let x = 0; x < moduleCount; x += 1) {
    if (qr.modules[y][x]) {
      modules += `<rect x="${(x + padding) * scale}" y="${(y + padding) * scale}" width="${scale}" height="${scale}"/>`;
    }
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="white"/><g fill="black">${modules}</g></svg>`;
const output = path.resolve(process.cwd(), "expo-qr.svg");
fs.writeFileSync(output, svg);
console.log(text);
console.log(output);
