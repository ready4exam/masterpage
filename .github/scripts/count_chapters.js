const fs = require('fs');
const path = require('path');

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
    const match = content.match(/curriculum\s*=\s*(\{[\s\S]*\});/);
    if (!match) return;

    const curriculum = new Function(`return ${match[1]}`)();
    const pathParts = filePath.split(path.sep);
    const board = pathParts[0].toLowerCase();
    const className = pathParts[1].toUpperCase();
    const targetBoard = results[board] ? board : 'other';

    let classGrandTotal = 0;

    Object.keys(curriculum).forEach(subject => {
      const subjectsData = curriculum[subject];
      
      Object.keys(subjectsData).forEach(bookOrStream => {
        const count = subjectsData[bookOrStream].length;
        classGrandTotal += count;

        // Logic to name the stream/book clearly
        let categoryName = bookOrStream;
        if (className.includes("11") || className.includes("12")) {
            if (bookOrStream.toLowerCase().includes("science")) categoryName = "Science Stream";
            else if (bookOrStream.toLowerCase().includes("commerce")) categoryName = "Commerce Stream";
            else if (bookOrStream.toLowerCase().includes("humanities") || bookOrStream.toLowerCase().includes("arts")) categoryName = "Humanities Stream";
        }

        results[targetBoard].push({ 
          "Class": className, 
          "Subject": subject, 
          "Category": categoryName,
          "Count": count,
          "Type": "row"
        });
      });
    });

    // Add Subtotal for the Class
    results[targetBoard].push({ 
      "Class": className, 
      "Subject": "TOTAL FOR " + className, 
      "Category": "---", 
      "Count": classGrandTotal,
      "Type": "subtotal" 
    });

  } catch (e) { console.error(`Error: ${e.message}`); }
});

Object.keys(results).forEach(board => {
  if (results[board].length === 0) return;

  const dir = path.join('data', board);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let boardGrandTotal = 0;
  let mdTable = `# ${board.toUpperCase()} Content Report - ${timestamp}\n\n`;
  mdTable += `| Class | Subject | Category/Stream | Chapters |\n| :--- | :--- | :--- | :--- |\n`;
  
  let csv = `Class,Subject,Category,Chapters\n`;

  // Sort by Class
  results[board].sort((a, b) => a.Class.localeCompare(b.Class, undefined, {numeric: true}));

  results[board].forEach(row => {
    const bold = row.Type === "subtotal" ? "**" : "";
    mdTable += `| ${bold}${row.Class}${bold} | ${bold}${row.Subject}${bold} | ${row.Category} | ${bold}${row.Count}${bold} |\n`;
    csv += `${row.Class},${row.Subject},${row.Category},${row.Count}\n`;
    
    if (row.Type === "subtotal") boardGrandTotal += row.Count;
  });

  // Final Grand Total for the Board
  mdTable += `| | | **GRAND TOTAL ALL CLASSES** | **${boardGrandTotal}** |\n`;
  csv += `,,,TOTAL:${boardGrandTotal}\n`;

  fs.writeFileSync(path.join(dir, `report_${timestamp}.md`), mdTable);
  fs.writeFileSync(path.join(dir, `data_${timestamp}.csv`), csv);
});
