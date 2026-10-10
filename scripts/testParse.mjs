import fs from 'fs';
import { parseStudyPgn } from '../src/study/studyParser.js';

async function test() {
  const pgn = await fetch('https://lichess.org/study/AXx2pMBm.pgn').then(res => res.text());
  const parsed = parseStudyPgn(pgn);
  console.log('Study Title:', parsed.title);
  console.log('Number of chapters:', parsed.chapters.length);
  parsed.chapters.forEach((ch, i) => {
    console.log(`\nChapter ${i + 1}:`, ch.title);
    console.log('Moves length:', ch.moves.length);
    console.log('First 5 moves:', ch.moves.slice(0, 5).map(m => m.san));
  });
}

test();
