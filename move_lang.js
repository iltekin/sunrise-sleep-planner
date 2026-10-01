const fs = require('fs');

const path = 'src/app/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Extract the whole Lang selector block
const langBlockRegex = /<div className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 z-50 no-print">\n\s*<Popover>[\s\S]*?<\/Popover>\n\s*<\/div>\n\n/;
const match = code.match(langBlockRegex);

if (match) {
  code = code.replace(langBlockRegex, '');
  
  let langBlock = match[0];
  // Replace its classes for mobile-first (footer) and desktop (fixed)
  langBlock = langBlock.replace(/<div className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 z-50 no-print">/, '<div className="flex justify-center sm:fixed sm:bottom-10 sm:right-10 z-50 no-print mt-4 sm:mt-0">');
  
  // Resize trigger for mobile
  langBlock = langBlock.replace(/w-14 h-14/g, 'w-8 h-8 sm:w-14 sm:h-14');
  langBlock = langBlock.replace(/<Globe className="h-6 w-6" \/>/g, '<Globe className="h-4 w-4 sm:h-6 sm:w-6" />');
  
  // Center popover on mobile
  langBlock = langBlock.replace(/align="end"/, 'align="center" className="sm:align-end w-40 p-2 rounded-2xl shadow-2xl border-zinc-200 bg-white/95 backdrop-blur-xl mb-2 sm:mb-4"');

  // Find the end of the footer
  const footerEndRegex = /<\/p>\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*\);/;
  
  code = code.replace(/<\/p>\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*\);/, `</p>\n\n${langBlock}        </div>\n      </div>\n    </div>\n  );`);
}

fs.writeFileSync(path, code);
console.log('Moved lang selector to footer');
