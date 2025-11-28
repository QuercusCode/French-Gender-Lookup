const express = require('express');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = 3000;

// Data store
const wordMap = new Map();

// Load data
const loadData = () => {
    console.log('Loading Lexique383.tsv...');
    const parser = fs.createReadStream(path.join(__dirname, 'Lexique383.tsv'))
        .pipe(parse({
            delimiter: '\t',
            columns: true,
            relax_quotes: true
        }));

    parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) {
            // We only care about words with a gender (m or f)
            if (record.genre && (record.genre === 'm' || record.genre === 'f')) {
                const word = record.ortho.toLowerCase();
                if (!wordMap.has(word)) {
                    wordMap.set(word, []);
                }
                // Avoid duplicates for the same word/gender/lemma combination
                const existing = wordMap.get(word);
                const isDuplicate = existing.some(item =>
                    item.genre === record.genre && item.lemme === record.lemme
                );

                if (!isDuplicate) {
                    existing.push({
                        word: record.ortho,
                        genre: record.genre,
                        lemme: record.lemme,
                        cgram: record.cgram,
                        phon: record.phon,
                        freq: parseFloat(record.freqfilms2),
                        nombre: record.nombre
                    });
                }
            }
        }
    });

    parser.on('error', (err) => {
        console.error('Error loading data:', err.message);
    });

    parser.on('end', () => {
        console.log(`Data loaded. ${wordMap.size} unique words indexed.`);
    });
};

loadData();

app.use(express.static('.'));

app.get('/api/lookup', async (req, res) => {
    const word = req.query.word;
    if (!word) {
        return res.status(400).json({ error: 'Word parameter is required' });
    }

    const lowerWord = word.toLowerCase();
    const localResults = wordMap.get(lowerWord);

    if (localResults) {
        return res.json({ found: true, source: 'local', results: localResults });
    }

    // Fallback to Wiktionary
    try {
        console.log(`Checking Wiktionary for: ${word}`);
        const wikiUrl = `https://fr.wiktionary.org/wiki/${encodeURIComponent(word)}`;
        const { data } = await axios.get(wikiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36' }
        });

        const $ = cheerio.load(data);
        const genders = new Set();

        // Look for gender indicators in the French section
        // This is a heuristic and might need refinement based on Wiktionary's structure
        // Common patterns: "masculin", "féminin", "masculin ou féminin"

        // Strategy: Look for the specific gender span or text near the pronunciation/definition
        // Wiktionary structure varies, but often has "masculin" or "féminin" in the "ligne-de-forme" or near it.

        const content = $('body').text(); // Simplified check for now, can be more specific if needed

        // More specific scraping attempts
        $('.ligne-de-forme, p').each((i, el) => {
            const text = $(el).text().toLowerCase();
            if (text.includes('masculin') && !text.includes('féminin')) {
                genders.add('m');
            } else if (text.includes('féminin') && !text.includes('masculin')) {
                genders.add('f');
            } else if (text.includes('masculin') && text.includes('féminin')) {
                genders.add('m');
                genders.add('f');
            }
        });

        if (genders.size > 0) {
            const results = Array.from(genders).map(g => ({
                word: word,
                genre: g,
                lemme: word, // Best guess
                cgram: 'NOM', // Best guess
                phon: '', // Not scraped yet
                freq: 0, // Unknown
                nombre: '' // Unknown
            }));
            return res.json({ found: true, source: 'wiktionary', results });
        }

    } catch (error) {
        console.error(`Wiktionary lookup failed for ${word}:`, error.message);
    }

    res.json({ found: false, results: [] });
});

app.get('/api/random', (req, res) => {
    if (wordMap.size === 0) {
        return res.status(503).json({ error: 'Data not loaded yet' });
    }
    const keys = Array.from(wordMap.keys());
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const results = wordMap.get(randomKey);
    res.json({ found: true, results });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
