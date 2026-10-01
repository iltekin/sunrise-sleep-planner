const fs = require('fs');

const i18nPath = 'src/lib/i18n.ts';
let i18nCode = fs.readFileSync(i18nPath, 'utf8');

const additions = {
  tr: 'downloadImg: "Resim İndir"',
  en: 'downloadImg: "Download Image"',
  es: 'downloadImg: "Descargar Imagen"',
  fr: 'downloadImg: "Télécharger Image"',
  de: 'downloadImg: "Bild Herunterladen"',
  zh: 'downloadImg: "下载图片"',
  ar: 'downloadImg: "تنزيل كصورة"',
  ru: 'downloadImg: "Скачать картинку"',
  pt: 'downloadImg: "Baixar Imagem"',
  ja: 'downloadImg: "画像をダウンロード"'
};

for (const [lang, text] of Object.entries(additions)) {
  const regex = new RegExp(\`(^\s*\${lang}: \\{[\\s\\S]*?)(downloadPdf:)\`, 'm');
  i18nCode = i18nCode.replace(regex, \`$1\${text},\\n    $2\`);
}

fs.writeFileSync(i18nPath, i18nCode);
console.log('Added downloadImg to i18n.ts');
