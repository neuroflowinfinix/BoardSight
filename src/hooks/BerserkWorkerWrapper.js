/**
 * BerserkWorkerWrapper.js
 * 
 * Converts Berserk WASM API to Stockfish Worker API.
 * Handles module initialization and UCI command forwarding.
 */

let engineInstance = null;
const messageQueue = [];
let isReady = false;

// Load Berserk module in worker context
try {
  importScripts('/berserk-v4.3.0/berserk.js');
} catch (err) {
  self.postMessage('ERROR: Failed to load berserk.js: ' + err.message);
}

// After script loads, instantiate Berserk
if (typeof Berserk !== 'undefined') {
  Berserk({
    print: (text) => {
      if (text && text.trim()) {
        self.postMessage(text.trim());
      }
    },
    printErr: (err) => {
      console.error('Berserk error:', err);
      self.postMessage('ERROR: ' + err);
    }
  }).then((instance) => {
    engineInstance = instance;
    isReady = true;
    
    // Process queued commands
    while (messageQueue.length > 0) {
      const cmd = messageQueue.shift();
      executeCommand(cmd);
    }
    
    self.postMessage('readyok');
  }).catch((err) => {
    console.error('Berserk init failed:', err);
    self.postMessage('ERROR: Berserk initialization failed: ' + err);
  });
} else {
  self.postMessage('ERROR: Berserk module not found');
}

function executeCommand(cmd) {
  if (!engineInstance) {
    console.error('Engine not ready for command:', cmd);
    return;
  }
  
  const cmdStr = cmd.endsWith('\n') ? cmd : cmd + '\n';
  
  try {
    engineInstance.ccall('ExecCommand', 'null', ['string'], [cmdStr]);
  } catch (e) {
    console.error('Berserk command error:', e, 'Command:', cmd);
    self.postMessage('ERROR: ' + e.message);
  }
}

// Handle messages from main thread
self.onmessage = (event) => {
  const cmd = event.data;
  
  if (!isReady) {
    messageQueue.push(cmd);
    return;
  }
  
  executeCommand(cmd);
};