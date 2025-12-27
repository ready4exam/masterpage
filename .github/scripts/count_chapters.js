const fs = require('fs');
const path = require('path');

// 1. Find all curriculum.js files in the repo
const getFiles = (dir, fileList = []) => {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      if (!name.includes('node_modules') && !name.includes('.git') && !name.includes('data')) {
        getFiles(name, fileList);
      }
    } else if (file === 'curriculum.js') {
      fileList.push(name);
    }
  });
  return fileList;
};

const curriculumFiles = getFiles('./');
const timestamp = new Date().toISOString().split('T')[0];
const results = { cbse: [], scert: [], icse: [], other: [] };

curriculumFiles.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Regex to grab the object regardless of export style
    const match = content.match(/curriculum\s*=\s*(\{[\s\S]*\});/);
    if (!match) return;

    // Use a Function constructor for safer evaluation of the JS object
    const curriculum = new Function(`return ${match[1]}`)();
    
    // Path analysis based on your structure: cbse/class-10/js/curriculum.js
    const pathParts = filePath.split(path.sep);
    const board = pathParts[0].toLowerCase(); // e.g., cbse
    const className = pathParts[1].toUpperCase(); // e.g., CLASS-10
    const targetBoard = results[board] ? board : 'other';

    Object.keys(curriculum).forEach(subject => {
      let totalChapters = 0;
      const subjectsData = curriculum[subject];
      
      Object.keys(subjectsData).forEach(bookOrStream => {
        if (Array.isArray(subjectsData[bookOrStream])) {
          totalChapters += subjectsData[bookOrStream].length;
        }
      });
      
      results[targetBoard].push({ 
        "Class": className, 
        "Subject": subject, 
        "Chapters": totalChapters 
      });
    });
  } catch (e) {
    console.error(`Error processing ${filePath}: ${e.message}`);
  }
});

// 2. Generate segregated Table outputs
Object.keys(results).forEach(board => {
  if (results[board].length === 0) return;

  const dir = path.join('data', board);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Markdown Table
  let mdTable = `# ${board.toUpperCase()} Content Report - ${timestamp}\n\n`;
  mdTable += `| Class | Subject | Chapter Count |\n| :--- | :--- | :--- |\n`;
  
  // Sort by Class name for better readability
  results[board].sort((a, b) => a.Class.localeCompare(b.Class));

  results[board].forEach(row => {
    mdTable += `| ${row.Class} | ${row.Subject} | ${row.Chapters} |\n`;
  });

  // CSV File
  let csv = `Class,Subject,Chapters\n`;
  results[board].forEach(row => {
    csv += `${row.Class},${row.Subject},${row.Chapters}\n`;
  });

  fs.writeFileSync(path.join(dir, `report_${timestamp}.md`), mdTable);
  fs.writeFileSync(path.join(dir, `data_${timestamp}.csv`), csv);
});

console.log("Tabular data generated in /data folder.");
