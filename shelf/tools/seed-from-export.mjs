import fs from 'fs';
const src = JSON.parse(fs.readFileSync('../export/books.json', 'utf8'));
const iso = d => {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec((d || '').trim());
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
};
const out = src
  .slice()
  .sort((a, b) => b.nr - a.nr)
  .map(b => ({
    id: b.id,
    title: b.title.trim(),
    author: (b.author || '').trim(),
    format: b.type === 'Audiobook' ? 'audiobook' : 'book',
    status: b.collection === 'Necitite' ? 'want' : 'read',
    rating: b.rating || 0,
    finishedAt: iso(b.dateFinished),
    notes: b.summary || '',
    shelf: b.collection === 'Necitite' ? '' : b.collection.replace('Citite ', ''),
    tags: [],
    coverUrl: '',
    isbn: '',
    pages: null,
    addedAt: null,
  }));
fs.writeFileSync('src/data/seed.json', JSON.stringify(out));
console.log(out.length, 'seeded;', out.filter(b => b.finishedAt).length, 'with dates');
