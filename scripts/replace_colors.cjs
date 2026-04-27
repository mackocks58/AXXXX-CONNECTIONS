const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

function replaceColorsInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Mappings for dark theme colors to light theme (white/blue/green)
    const replacements = [
        // Dark backgrounds
        [/rgba\(17,\s*27,\s*51,\s*([0-9.]+)\)/g, 'rgba(255, 255, 255, $1)'],
        [/rgba\(5,\s*8,\s*22,\s*([0-9.]+)\)/g, 'rgba(248, 250, 252, $1)'],
        [/rgba\(0,\s*0,\s*0,\s*([0-9.]+)\)/g, 'rgba(255, 255, 255, $1)'],
        [/#050816/g, '#ffffff'],
        [/#111b33/g, '#f1f5f9'],
        
        // Whites used as borders/backgrounds or text
        [/rgba\(255,\s*255,\s*255,\s*([0-9.]+)\)/g, 'rgba(15, 23, 42, $1)'],
        [/#fff(fff)?([^A-Za-z0-9])/gi, '#0f172a$2'],
        [/"white"/g, '"#0f172a"'],

        // Yellow branding -> Blue
        [/#fef08a/g, '#bae6fd'],
        [/#facc15/g, '#0ea5e9'],
        [/#a16207/g, '#0284c7'],
        [/rgba\(250,\s*204,\s*21,\s*([0-9.]+)\)/g, 'rgba(14, 165, 233, $1)'],

        // Text colors
        [/#a0aec0/g, '#64748b'],
        [/#e2e8f0/g, '#334155'],

        // Some specific gradients
        [/linear-gradient\(180deg,\s*rgba\(17, 27, 51, [^\)]+\),\s*rgba\(5, 8, 22, [^\)]+\)\)/g, 'linear-gradient(180deg, #ffffff, #f8fafc)']
    ];

    let newContent = content;
    for (const [regex, replacement] of replacements) {
        newContent = newContent.replace(regex, replacement);
    }

    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            replaceColorsInFile(fullPath);
        }
    }
}

processDirectory(srcDir);
console.log('Color replacement complete.');
