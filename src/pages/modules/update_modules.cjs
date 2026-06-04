const fs = require('fs');
const path = require('path');
const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');

  // Replace header pattern
  content = content.replace(/<div className="flex items-center justify-between mb-8">/g, 
    '<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">');
  content = content.replace(/<div className="mb-8 flex justify-between items-center">/g, 
    '<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">');
  content = content.replace(/<div className="flex justify-between items-center mb-8">/g, 
    '<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">');

  // Replace header h1
  content = content.replace(/<h1 className="font-mono font-bold text-3xl text-\[#d8f3dc\] uppercase tracking-wider">/g, 
    '<h1 className="font-mono font-bold text-2xl md:text-3xl text-[#d8f3dc] uppercase tracking-wider mb-1">');

  // Button in header
  content = content.replace(/className="hex-btn-primary flex items-center gap-2"/g, 
    'className="hex-btn-primary flex items-center justify-center gap-2 w-full sm:w-auto whitespace-nowrap"');
  
  content = content.replace(/className="hex-btn-primary"/g, 
    'className="hex-btn-primary w-full sm:w-auto whitespace-nowrap"');

  // Replace tables to be scrollable
  if (content.includes('<table') && !content.includes('overflow-x-auto')) {
    content = content.replace(/<table className="([^"]+)">/g, '<div className="overflow-x-auto">\n          <table className="$1 min-w-[600px]">');
    content = content.replace(/<\/table>/g, '</table>\n        </div>');
  }

  // Grids responsive
  content = content.replace(/grid-cols-3/g, 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3');
  content = content.replace(/grid-cols-4/g, 'grid-cols-2 lg:grid-cols-4');
  content = content.replace(/grid-cols-2([^l])/g, 'grid-cols-1 md:grid-cols-2$1');

  // P-8 -> p-4 md:p-8
  content = content.replace(/className="([^"]*)p-8([^"]*)"/g, 'className="$1p-4 md:p-8$2"');
  // p-6 -> p-4 md:p-6 for cards
  content = content.replace(/className="([^"]*)p-6([^"]*)"/g, 'className="$1p-4 md:p-6$2"');

  fs.writeFileSync(path.join(dir, file), content);
}
console.log('Update complete');
