import React, { useState, useEffect } from 'react';

const MORNING_MSGS = [
  "Good morning! Ready to review a game?",
  "Rise and shine! Let's look at some chess.",
  "Morning! Let's find some brilliant moves today. ☀️",
  "A fresh morning for a fresh game review.",
  "Good morning. Let's see what the engine thinks.",
  "Wake up your brain with a quick game analysis!",
  "Morning coffee and game review. Perfect combo. ☕",
  "Early bird gets the Elo! Let's review.",
  "Good morning! Paste a PGN when you're ready.",
  "Start your day with some tactical improvements.",
  "Good morning! Let's uncover those missed wins.",
  "Hello there! Ready for your morning review?",
  "Morning! Let's see how well you played.",
  "Welcome! Let's make this morning productive.",
  "Good morning! Let's dive into the opening theory."
];

const AFTERNOON_MSGS = [
  "Good afternoon! Let's get a game reviewed.",
  "Afternoon! Ready to analyze your latest match?",
  "Good afternoon. Drop a PGN to get started.",
  "Time for an afternoon chess break! ♟️",
  "Afternoon! Let's see if we can find some blunders.",
  "Hope your afternoon is going well! Let's review.",
  "Good afternoon! Let's check your accuracy today.",
  "Midday review time! Paste your game below.",
  "Afternoon! Let's find where things went wrong.",
  "Good afternoon! Let's look at the middlegame tactics.",
  "Taking an afternoon break? Let's analyze a game. ☕",
  "Good afternoon. The engine is warmed up and ready.",
  "Afternoon! Let's see what the coach has to say.",
  "Hello! Ready to crunch some numbers this afternoon?",
  "Good afternoon! Let's dive right into the analysis."
];

const EVENING_MSGS = [
  "Good evening! Ready to unwind with a game review?",
  "Evening! Let's look over your games from today.",
  "Good evening. Let's find those brilliant moves! ✨",
  "Winding down? Let's review a quick game.",
  "Evening! The board is set for your analysis.",
  "Good evening! Let's see how your endgames hold up.",
  "Time for an evening study session!",
  "Good evening! Drop a PGN whenever you're ready.",
  "Evening! Let's see what Stockfish thinks of that sacrifice. 🐴",
  "Good evening. Let's turn those mistakes into lessons.",
  "Hope you had a great day! Let's analyze.",
  "Evening! Let's review before calling it a day.",
  "Good evening! Let's dig into the game report.",
  "Relax and review. Good evening!",
  "Evening! Ready to check your game accuracy?"
];

const NIGHT_MSGS = [
  "Burning the midnight oil? Let's review a game. 🦉",
  "Late night chess? Let's see how you did.",
  "Good night! Or rather, good game review time.",
  "Up late analyzing? The engine never sleeps!",
  "Late night tactics review. Let's get started.",
  "Can't sleep? Let's look at some chess games. ♟️",
  "Night owl mode activated. Paste your PGN!",
  "Late night studying always pays off. Let's review.",
  "Still awake? Let's find those missed wins.",
  "Nighttime analysis is the best analysis. 🌌",
  "The engine is ready whenever you are tonight.",
  "Late night review session. Let's go!",
  "Analyzing games in the dark? We've got you.",
  "Late night chess thoughts. Let's see the report.",
  "Up late? Let's put that brainpower into a game review."
];

export default function WelcomeMessage() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    let pool = [];

    if (hour >= 5 && hour < 12) {
      pool = MORNING_MSGS;
    } else if (hour >= 12 && hour < 17) {
      pool = AFTERNOON_MSGS;
    } else if (hour >= 17 && hour < 21) {
      pool = EVENING_MSGS;
    } else {
      pool = NIGHT_MSGS;
    }

    const randomMsg = pool[Math.floor(Math.random() * pool.length)];
    setMessage(randomMsg);
  }, []);

  if (!message) return null;

  return (
    <span className="text-[15px] font-semibold text-gray-900 dark:text-slate-100">
      {message}
    </span>
  );
}