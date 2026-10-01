const fs = require('fs');

const path = 'src/app/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Imports
if (!code.includes('import jsPDF')) {
  code = code.replace(/import \{ format, addDays, startOfDay \} from "date-fns";/, 'import { format, addDays, startOfDay } from "date-fns";\nimport jsPDF from "jspdf";\nimport html2canvas from "html2canvas";');
}

if (!code.includes('ChevronDown')) {
  code = code.replace(/Globe, Sun/, 'Globe, Sun, ChevronDown, Image as ImageIcon');
}

// Download functions
const downloadFunctions = `
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingImg, setIsDownloadingImg] = useState(false);

  const downloadPDF = async () => {
    const el = document.getElementById("printable-schedule");
    if (!el) return;
    setIsDownloadingPdf(true);
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save("sunrise-sleep-schedule.pdf");
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const downloadImage = async () => {
    const el = document.getElementById("printable-schedule");
    if (!el) return;
    setIsDownloadingImg(true);
    try {
      const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = "sunrise-sleep-schedule.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloadingImg(false);
    }
  };
`;

code = code.replace(/const generateSchedule = \(\) => \{/, downloadFunctions + '\n  const generateSchedule = () => {');

// The split button replacement
const oldButton = /<button onClick=\{\(\) => window\.print\(\)\} className="flex items-center justify-center flex-1 sm:flex-none h-12 px-6 rounded-xl font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition-colors">\n\s*<Download className="mr-2 h-5 w-5" \/>\n\s*\{t\.downloadPdf\}\n\s*<\/button>/;

const newButton = `<div className="flex flex-1 sm:flex-none h-12 rounded-xl font-medium bg-zinc-900 text-white shadow-sm overflow-visible">
                  <button onClick={downloadPDF} disabled={isDownloadingPdf} className="flex flex-1 items-center justify-center px-4 sm:px-6 hover:bg-zinc-800 transition-colors disabled:opacity-50 rounded-l-xl">
                    {isDownloadingPdf ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
                    {t.downloadPdf}
                  </button>
                  <div className="w-[1px] bg-zinc-700/50 my-2"></div>
                  <Popover>
                    <PopoverTrigger className="px-3 hover:bg-zinc-800 transition-colors rounded-r-xl outline-none flex items-center justify-center">
                      <ChevronDown className="h-5 w-5" />
                    </PopoverTrigger>
                    <PopoverContent align="end" side="top" className="w-48 p-2 rounded-xl shadow-xl mb-2">
                      <button onClick={downloadImage} disabled={isDownloadingImg} className="w-full flex items-center px-3 py-2.5 text-sm font-medium hover:bg-zinc-100 rounded-lg text-zinc-700 transition-colors disabled:opacity-50">
                        {isDownloadingImg ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                        {t.downloadImg}
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>`;

code = code.replace(oldButton, newButton);

fs.writeFileSync(path, code);
console.log('Implemented jsPDF and Split Button');
