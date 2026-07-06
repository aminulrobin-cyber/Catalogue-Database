const fs = require('fs');
const path = require('path');

const dir = './src';
const regex = /dark:bg-black\/(20|30|40|50|60)/g;

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(dir);
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (regex.test(content)) {
    content = content.replace(regex, 'dark:bg-[#111]');
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
