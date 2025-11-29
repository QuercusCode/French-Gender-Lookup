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
            let type = row.cgram || '';

            // Map common abbreviations
            const typeMap = {
                'NOM': 'Noun',
                'ADJ': 'Adjective',
                'VER': 'Verb',
                'ADV': 'Adverb',
                'PRE': 'Preposition',
                'PRO': 'Pronoun',
                'CON': 'Conjunction',
                'ART': 'Article',
                'ONO': 'Onomatopoeia',
                'INT': 'Interjection'
            };

            // Use mapped type or original if not found (title case)
            type = typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

            // Store object with gender and type
            // Optimization: Lowercase key for case-insensitive lookup
            wordMap[word.toLowerCase()] = {
                g: gender,
                t: type
            };
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
