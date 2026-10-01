const fs = require('fs');

const i18nPath = 'src/lib/i18n.ts';
let i18nCode = fs.readFileSync(i18nPath, 'utf8');

i18nCode = i18nCode.replace(/downloadPdf: "PDF İndir"/g, 'downloadImg: "Resim İndir", downloadPdf: "PDF İndir"');
i18nCode = i18nCode.replace(/downloadPdf: "Download PDF"/g, 'downloadImg: "Download Image", downloadPdf: "Download PDF"');
i18nCode = i18nCode.replace(/downloadPdf: "Descargar PDF"/g, 'downloadImg: "Descargar Imagen", downloadPdf: "Descargar PDF"');
i18nCode = i18nCode.replace(/downloadPdf: "Télécharger le PDF"/g, 'downloadImg: "Télécharger Image", downloadPdf: "Télécharger le PDF"');
i18nCode = i18nCode.replace(/downloadPdf: "PDF herunterladen"/g, 'downloadImg: "Bild Herunterladen", downloadPdf: "PDF herunterladen"');
i18nCode = i18nCode.replace(/downloadPdf: "下载 PDF"/g, 'downloadImg: "下载图片", downloadPdf: "下载 PDF"');
i18nCode = i18nCode.replace(/downloadPdf: "تنزيل PDF"/g, 'downloadImg: "تنزيل كصورة", downloadPdf: "تنزيل PDF"');
i18nCode = i18nCode.replace(/downloadPdf: "Скачать PDF"/g, 'downloadImg: "Скачать картинку", downloadPdf: "Скачать PDF"');
i18nCode = i18nCode.replace(/downloadPdf: "Baixar PDF"/g, 'downloadImg: "Baixar Imagem", downloadPdf: "Baixar PDF"');
i18nCode = i18nCode.replace(/downloadPdf: "PDFをダウンロード"/g, 'downloadImg: "画像をダウンロード", downloadPdf: "PDFをダウンロード"');

fs.writeFileSync(i18nPath, i18nCode);
console.log('Added downloadImg to i18n.ts');
