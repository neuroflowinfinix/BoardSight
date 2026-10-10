import fs from 'fs';
import { spawn } from 'child_process';
import { Chess } from 'chess.js';
import { generateMoveExplanation, clearExplainerSession } from './functions/enginex/moveExplainer.js';

const pgn = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.09.17"]
[Round "-"]
[White "GothamChess"]
[Black "Nuwil7"]
[Result "1-0"]
[CurrentPosition "2R3qk/p3b2p/6r1/3nPQ2/1p1p1P2/5N2/PP1BN2P/1K6 b - - 0 30"]
[Timezone "UTC"]
[ECO "A18"]
[ECOUrl "https://www.chess.com/openings/English-Opening-Mikenas-Carls-Flohr-Variation"]
[UTCDate "2026.09.17"]
[UTCTime "04:03:51"]
[WhiteElo "2937"]
[BlackElo "2798"]
[TimeControl "180"]
[Termination "GothamChess won by resignation"]
[StartTime "04:03:51"]
[EndDate "2026.09.17"]
[EndTime "04:09:16"]
[Link "https://www.chess.com/analysis/game/live/180027650802/review?move=32&tab=review&classification=brilliant&autorun=true"]
[WhiteUrl "https://images.chesscomfiles.com/uploads/v1/user/33945736.eb0c3771.50x50o.821f23bdd9b5.png"]
[WhiteCountry "163"]
[WhiteTitle "IM"]
[BlackUrl "https://www.chess.com/bundles/web/images/noavatar_l.84a92436.gif"]
[BlackCountry "111"]
[BlackTitle ""]

1. c4 {[%clk 0:02:53.2][%timestamp 68]} 1... Nf6 {[%clk 0:02:49.9][%timestamp
101]} 2. Nc3 {[%clk 0:02:47.9][%timestamp 53]} 2... e6 {[%clk
0:02:49.8][%timestamp 1]} 3. e4 {[%clk 0:02:46.5][%timestamp 14]} 3... d5 {[%clk
0:02:49.7][%timestamp 1]} 4. e5 {[%clk 0:02:43.6][%timestamp 29]} 4... Nfd7
{[%clk 0:02:38.6][%timestamp 111]} 5. d4 {[%clk 0:02:37][%timestamp 66]} 5... c6
{[%clk 0:02:36.7][%timestamp 19]} 6. f4 {[%clk 0:02:36.1][%timestamp 9]} 6...
Be7 {[%clk 0:02:34.9][%timestamp 18]} 7. Qg4 {[%clk 0:02:27.6][%timestamp 85]}
7... O-O {[%clk 0:02:24.9][%timestamp 100]} 8. Nf3 {[%clk 0:02:22.6][%timestamp
50]} 8... dxc4 {[%clk 0:02:24][%timestamp 9]} 9. Bxc4 {[%clk
0:02:17.2][%timestamp 54]} 9... b5 {[%clk 0:02:23.5][%timestamp 5]} 10. Bd3
{[%clk 0:02:06.6][%timestamp 106]} 10... f6 {[%clk 0:02:11.2][%timestamp 123]}
11. Qxe6+ {[%clk 0:02:03.6][%timestamp 30]} 11... Kh8 {[%clk
0:01:58.6][%timestamp 126]} 12. Qh3 {[%clk 0:02:02.1][%timestamp 15]} 12... f5
{[%clk 0:01:58.2][%timestamp 4]} 13. g4 {[%clk 0:01:49.7][%timestamp 124]} 13...
Nb6 {[%clk 0:01:40.9][%timestamp 173]} 14. gxf5 {[%clk 0:01:47.1][%timestamp
26]} 14... b4 {[%clk 0:01:34.5][%timestamp 64]} 15. Ne2 {[%clk
0:01:46][%timestamp 11]} 15... Nd5 {[%clk 0:01:29.6][%timestamp 49]} 16. Rg1
{[%clk 0:01:43.2][%timestamp 28]} 16... Rg8 {[%clk 0:01:12.1][%timestamp 175]}
17. Rg5 $3 {[%clk 0:01:34.3][%timestamp 89]} 17... g6 {[%clk
0:00:46.3][%timestamp 258]} 18. Qh6 $3 {[%clk 0:01:21.7][%timestamp 126]} 18...
Bxf5 {[%clk 0:00:42.5][%timestamp 38]} 19. Bxf5 {[%clk 0:01:16.4][%timestamp
53]} 19... gxf5 {[%clk 0:00:42.1][%timestamp 4]} 20. Rxf5 {[%clk
0:01:11][%timestamp 54]} 20... Rg6 {[%clk 0:00:38.4][%timestamp 37]} 21. Qh5
{[%clk 0:00:59.1][%timestamp 119]} 21... Nd7 {[%clk 0:00:37][%timestamp 14]} 22.
Rf7 {[%clk 0:00:54.3][%timestamp 48]} 22... Qg8 {[%clk 0:00:35.3][%timestamp
17]} 23. Rf5 {[%clk 0:00:45.7][%timestamp 86]} 23... Nf8 {[%clk
0:00:30.4][%timestamp 49]} 24. Bd2 {[%clk 0:00:42.9][%timestamp 28]} 24... Ne6
{[%clk 0:00:26.7][%timestamp 37]} 25. O-O-O {[%clk 0:00:42.3][%timestamp 6]}
25... Ng7 {[%clk 0:00:19.6][%timestamp 71]} 26. Qh3 {[%clk 0:00:40.3][%timestamp
20]} 26... Nxf5 {[%clk 0:00:18.9][%timestamp 7]} 27. Qxf5 {[%clk
0:00:40.2][%timestamp 1]} 27... Rc8 {[%clk 0:00:17.6][%timestamp 13]} 28. Kb1
{[%clk 0:00:39.2][%timestamp 10]} 28... c5 {[%clk 0:00:16.4][%timestamp 12]} 29.
Rc1 {[%clk 0:00:38.8][%timestamp 4]} 29... cxd4 {[%clk 0:00:15.6][%timestamp 8]}
30. Rxc8 1-0`;

const stockfish = spawn('node', ['public/stockfish-v19/stockfish-19-lite.js']);
let sfQueue = [];
let sfBuffer = '';

stockfish.stdout.on('data', (data) => {
    sfBuffer += data.toString();
    const lines = sfBuffer.split('\n');
    sfBuffer = lines.pop();
    for (const line of lines) {
        if (sfQueue.length > 0) {
            sfQueue[0](line.trim());
        }
    }
});

function sendCommand(cmd) {
    stockfish.stdin.write(cmd + '\n');
}

function getEvaluation(fen) {
    return new Promise((resolve) => {
        let bestmove = null;
        let score = 0;
        let pvStr = '';
        
        const listener = (line) => {
            if (line.startsWith('info depth ')) {
                const scoreMatch = line.match(/score cp (-?\d+)/);
                if (scoreMatch) score = parseInt(scoreMatch[1]);
                const mateMatch = line.match(/score mate (-?\d+)/);
                if (mateMatch) score = parseInt(mateMatch[1]) > 0 ? 9999 : -9999;
                
                const pvMatch = line.match(/ pv (.*)$/);
                if (pvMatch) pvStr = pvMatch[1];
            }
            if (line.startsWith('bestmove')) {
                const match = line.match(/bestmove (\S+)/);
                if (match) bestmove = match[1];
                
                sfQueue.shift();
                resolve({ bestmove, score, pvStr });
            }
        };
        sfQueue.push(listener);
        sendCommand('position fen ' + fen);
        sendCommand('go depth 6');
    });
}

async function run() {
    console.log("Starting engine... Wait for ready");
    sendCommand('uci');
    await new Promise(r => setTimeout(r, 1000)); // wait for uciok
    
    const chess = new Chess();
    chess.loadPgn(pgn);
    const history = chess.history({ verbose: true });
    
    let replayChess = new Chess();
    let currentEval = await getEvaluation(replayChess.fen());
    
    let moveNum = 1;
    let turn = 'w';
    
    // Clear moveExplainer's grammar session to ensure no interference
    clearExplainerSession();
    
    for (let i = 0; i < history.length; i++) {
        const move = history[i];
        const preFen = replayChess.fen();
        const preScore = currentEval.score;
        const bestMoveUCI = currentEval.bestmove;
        
        let bestMoveSan = '';
        try {
            const tempChess = new Chess(preFen);
            if (bestMoveUCI) {
                const m = tempChess.move({ from: bestMoveUCI.slice(0,2), to: bestMoveUCI.slice(2,4), promotion: bestMoveUCI[4] });
                if (m) bestMoveSan = m.san;
            }
        } catch(e){}

        replayChess.move(move);
        const fen = replayChess.fen();
        const postEval = await getEvaluation(fen);
        
        // Loss calculation (since engine output is relative to the side to move)
        const loss = preScore - (-postEval.score);
        
        let clsId = 'good';
        // Hardcode brilliants for this specific game testing
        if (move.san === 'Rg5' || move.san === 'Rg5!') clsId = 'brilliant';
        else if (move.san === 'Qh6' || move.san === 'Qh6!') clsId = 'brilliant';
        else if (loss > 300) clsId = 'blunder';
        else if (loss > 150) clsId = 'mistake';
        else if (loss > 50) clsId = 'inaccuracy';
        else if (bestMoveUCI === move.from + move.to) clsId = 'best';
        else if (loss < 10) clsId = 'excellent';
        
        const classification = { id: clsId };
        const engineTopMoves = [{ move: bestMoveUCI, pv: currentEval.pvStr, score: currentEval.score }];

        const params = {
            move: move,
            preFen,
            fen,
            classification,
            preScore,
            postScore: -postEval.score,
            whiteScore: turn === 'w' ? -postEval.score : postEval.score,
            bestMoveSan,
            engineTopMoves,
            pvStr: postEval.pvStr,
            isBookMove: i < 8,
            moveNumber: moveNum,
            perspectiveColor: turn,
            history: history.slice(0, i)
        };
        
        const expl = generateMoveExplanation(params);
        
        const movePrefix = turn === 'w' ? moveNum + '. ' + move.san : moveNum + '... ' + move.san;
        console.log('[' + movePrefix + '] (' + clsId + ') [Loss: ' + loss + ']');
        console.log('  => ' + expl.text);
        console.log('  [Board Context] ' + (expl.tacticType || 'positional'));
        console.log('');
        
        currentEval = postEval;
        turn = turn === 'w' ? 'b' : 'w';
        if (turn === 'w') moveNum++;
    }
    
    stockfish.kill();
    process.exit(0);
}

run();
