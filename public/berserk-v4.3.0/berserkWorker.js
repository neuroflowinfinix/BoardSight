// Berserk WASM worker — mirrors the reference worker.js from berserk-wasm-pro
// Uses importScripts (the only way to load scripts in a Web Worker context).

importScripts('berserk.js');

let engineInstance = null;
const messageQueue = [];

Berserk({
  print:    (text) => { if (text && text.trim()) postMessage(text.trim()); },
  printErr: (err)  => console.error("Berserk Error:", err)
}).then((instance) => {
  engineInstance = instance;

  // Drain any commands that arrived during init
  while (messageQueue.length > 0) {
    const cmd = messageQueue.shift();
    instance.ccall('ExecCommand', 'null', ['string'], [cmd]);
  }

  // Signal UCI controller that the engine is ready
  postMessage("readyok");
}).catch((err) => {
  console.error("Berserk init failed:", err);
  postMessage("ERROR: Berserk init failed: " + err);
});

onmessage = (e) => {
  const cmd = typeof e.data === 'string' ? e.data : null;
  if (!cmd) return;

  if (!engineInstance) {
    messageQueue.push(cmd);
    return;
  }

  try {
    engineInstance.ccall('ExecCommand', 'null', ['string'], [cmd]);
  } catch (err) {
    console.error('Berserk command error:', err, 'Command:', cmd);
  }
};
