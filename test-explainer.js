import fs from 'fs';
import { Chess } from 'chess.js';
import { generateMoveExplanation } from './functions/enginex/moveExplainer.js';
import { getOpeningExplanation } from './functions/enginex/openingExplainer.js';

const pgn = `[Event "Live Chess"]
[White "Trevp13"]
[Black "magnus_unleashed"]
[Result "0-1"]

1. e4 e5 2. Nc3 Nf6 3. f4 exf4 4. Nf3 Nc6 5. Bc4 d5 6. exd5 Bg4 7. d3
Nd4 8. Qd2 Bxf3 9. gxf3 Nxf3+ 10. Kf2 Nxd2 11. Bxd2 c6 12. Rae1+ Be7 13.
Bxf4 cxd5 14. Nxd5 Nxd5 15. Bxd5 Qxd5 16. c4 Qf5 17. Kf3 O-O 18. Rxe7 Qc5 19.
Rhe1 Qc6+ 20. R1e4 Rfe8 21. Rxe8+ Rxe8 22. d4 Qxe4+ 23. Kg4 Qxd4 24. b3
Qg1+ 25. Kf3 Qa1 26. a4 Qc3+ 27. Kg4 Qxb3 28. c5 Qxa4 29. Kf5 Re4 30. Bd6 Qc6
31. h4 Rxh4 32. Be7 Rh5+ 33. Kf4 Rxc5 34. Bxc5 Qxc5 35. Ke4 a6 36. Kd3 a5 37.
Kd2 a4 0-1`;

const classifications = [
  'book', 'book', 'book', 'book', 'book', 'inaccuracy', 'inaccuracy', 'excellent',
  'best', 'good', 'best', 'blunder', 'miss', 'brilliant', 'mistake', 'great', 
  'mistake', 'great', 
  'good', 'great', 
  'excellent', 'good', 
  'excellent', 'best', 
  'excellent', 'great', 
  'good', 'great', 
  'best', 'best', 
  'good', 'excellent', 
  'good', 'inaccuracy', 
  'best', 'good', 
  'best', 'great', 
  'mistake', 'inaccuracy', 
  'good', 'best', 
  'mistake', 'great', 
  'excellent', 'excellent', 
  'excellent', 'great', 
  'best', 'excellent', 
  'excellent', 'great', 
  'best', 'excellent', 
  'best', 'excellent', 
  'excellent', 'excellent', 
  'excellent', 'excellent', 
  'best', 'excellent', 
  'excellent', 'miss', 
  'excellent', 'excellent', 
  'best', 'good', 
  'inaccuracy', 'good', 
  'good', 'excellent', 
  'excellent', 'best'
];

function runTest() {
    const chess = new Chess();
    chess.loadPgn(pgn);
    const history = chess.history({ verbose: true });
    
    let replayChess = new Chess();
    let moveNum = 1;
    
    for (let i = 0; i < history.length; i++) {
        const move = history[i];
        const preFen = replayChess.fen();
        const color = move.color;
        replayChess.move(move);
        const fen = replayChess.fen();
        
        const clsId = classifications[i] || 'good';
        let classification = { id: clsId };
        
        const params = {
            move: move,
            preFen,
            fen,
            classification,
            preScore: 0,
            whiteScore: 0,
            isBookMove: clsId === 'book',
            history: history.slice(0, i).map((m, idx) => ({ ...m, classification: { id: classifications[idx] } })),
            perspectiveColor: 'w' // Test from White's perspective
        };
        
        const expl = generateMoveExplanation(params);
        
        const movePrefix = color === 'w' ? moveNum + '. ' + move.san : moveNum + '... ' + move.san;
        console.log('[' + movePrefix + '] (' + clsId + ')');
        console.log('  => ' + expl.text);
        console.log('');
        
        if (color === 'b') moveNum++;
    }
}

runTest();
