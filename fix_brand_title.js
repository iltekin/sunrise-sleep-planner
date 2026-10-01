const fs = require('fs');

const i18nPath = 'src/lib/i18n.ts';
let i18nCode = fs.readFileSync(i18nPath, 'utf8');

i18nCode = i18nCode.replace(/title: "Uyku Planı Oluşturucu"/g, 'title: "Sunrise Sleep Planner"');
i18nCode = i18nCode.replace(/title: "Sleep Schedule Generator"/g, 'title: "Sunrise Sleep Planner"');
i18nCode = i18nCode.replace(/title: "Generador de Horarios de Sueño"/g, 'title: "Sunrise Sleep Planner"');
i18nCode = i18nCode.replace(/title: "Générateur d'Horaires de Sommeil"/g, 'title: "Sunrise Sleep Planner"');
i18nCode = i18nCode.replace(/title: "Schlafplan-Generator"/g, 'title: "Sunrise Sleep Planner"');
i18nCode = i18nCode.replace(/title: "睡眠时间表生成器"/g, 'title: "Sunrise Sleep Planner"');
i18nCode = i18nCode.replace(/title: "مولد جدول النوم"/g, 'title: "Sunrise Sleep Planner"');
i18nCode = i18nCode.replace(/title: "Генератор графика сна"/g, 'title: "Sunrise Sleep Planner"');
i18nCode = i18nCode.replace(/title: "Gerador de Horário de Sono"/g, 'title: "Sunrise Sleep Planner"');
i18nCode = i18nCode.replace(/title: "睡眠スケジュールジェネレーター"/g, 'title: "Sunrise Sleep Planner"');

fs.writeFileSync(i18nPath, i18nCode);
console.log('Fixed brand title');
