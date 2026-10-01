const fs = require('fs');

const path = 'src/app/page.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldHeader = /<h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 mb-1">\{t\.resultTitle\}<\/h2>\n\s*<div className="text-zinc-500 text-base h-6 flex items-center">\n\s*\{selectedLocation \?\ \(\n\s*<p>\{selectedLocation\.name\} konumu için \{getOffsetString\(sunriseOffset\)\} uyanılacak şekilde hesaplandı\.<\/p>\n\s*\) : \(/;

const newHeader = `<h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 mb-2 sm:mb-3">{t.resultTitle}</h2>
                  <div className="text-zinc-500 text-sm sm:text-base leading-relaxed min-h-[24px] flex items-center">
                    {selectedLocation ? (
                      <p>{t.resultDesc.replace("{loc}", selectedLocation.name || "").replace("{offset}", getOffsetString(sunriseOffset))}</p>
                    ) : (`;

code = code.replace(oldHeader, newHeader);

fs.writeFileSync(path, code);
console.log('Fixed step 5 header layout and translation');
