const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');

const lexiquePath = path.join(__dirname, 'Lexique383.tsv');
const outputPath = path.join(__dirname, 'words.json');

const wordMap = {};

console.log('Reading Lexique383.tsv...');

fs.createReadStream(lexiquePath)
    .pipe(parse({ delimiter: '\t', columns: true }))
    .on('data', (row) => {
        const word = row.ortho;
        const gender = row.genre;

        // Only keep words with a valid gender (m or f)
        if (word && (gender === 'm' || gender === 'f')) {
            // If word exists, prioritize masculine/feminine if it differs? 
            // For simplicity, we'll overwrite or keep first. 
            // Lexique might have duplicates for homographs.
            // Let's store it. If it's already there, we might want to handle it, 
            // but for a simple lookup, the last one wins or we check if it's the same.

            // Optimization: Lowercase key for case-insensitive lookup
            wordMap[word.toLowerCase()] = gender;
        }
    })
    .on('end', () => {
        console.log(`Processed ${Object.keys(wordMap).length} words.`);
        fs.writeFileSync(outputPath, JSON.stringify(wordMap));
        console.log(`Successfully wrote to ${outputPath}`);
    })
    .on('error', (err) => {
        console.error('Error parsing CSV:', err);
    });
