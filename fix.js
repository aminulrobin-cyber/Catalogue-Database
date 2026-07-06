const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Remove dark text color classes
  content = content.replace(/dark:text-white(\/[0-9]+)?/g, '');
  content = content.replace(/dark:placeholder:text-white(\/[0-9]+)?/g, '');
  content = content.replace(/dark:hover:text-white(\/[0-9]+)?/g, '');
  
  // Clean up double spaces in class names
  content = content.replace(/className="([^"]+)"/g, (match, p1) => {
    return `className="${p1.replace(/\s+/g, ' ').trim()}"`;
  });

  fs.writeFileSync(fullPath, content);
  console.log(`Updated ${filePath}`);
}

const files = [
  'src/app/layout.tsx',
  'src/components/Dashboard.tsx',
  'src/components/SheetView.tsx',
  'src/app/admin/page.tsx',
  'src/components/ThemeToggle.tsx',
  'src/app/globals.css'
];

files.forEach(f => replaceInFile(f));
