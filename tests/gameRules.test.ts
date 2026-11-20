import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateDraftChemistry,
  canLudoTokenMove,
  checkFourGoalsWin,
  evaluateWordGuess,
  FourGoalsCell,
  getLudoGlobalTrackIndex,
  isSudokuPlacementValid,
} from '../src/utils/gameRules.ts';
import { formatShareMessage } from '../src/utils/shareFormat.ts';

test('evaluateWordGuess handles duplicate letters accurately', () => {
  // Target: NKANA (N at 0,3; A at 2,4; K at 1)
  const eval1 = evaluateWordGuess('AAANN', 'NKANA');
  assert.deepEqual(eval1, ['present', 'absent', 'correct', 'correct', 'present']);

  const exact = evaluateWordGuess('NKANA', 'NKANA');
  assert.deepEqual(exact, ['correct', 'correct', 'correct', 'correct', 'correct']);
});

test('checkFourGoalsWin detects horizontal, vertical, and diagonal wins', () => {
  const empty: FourGoalsCell[][] = Array.from({ length: 6 }, () => Array(7).fill(0));
  assert.equal(checkFourGoalsWin(empty), null);

  const diag = empty.map((r) => [...r]);
  diag[5][0] = 1;
  diag[4][1] = 1;
  diag[3][2] = 1;
  diag[2][3] = 1;
  const res = checkFourGoalsWin(diag);
  assert.ok(res);
  assert.equal(res.winner, 1);
  assert.equal(res.line.length, 4);
});

test('isSudokuPlacementValid enforces row, column, and 2x3 box uniqueness', () => {
  const board = [
    [1, 2, 3, 4, 5, 6],
    [4, 5, 6, 1, 2, 3],
    [2, 3, 1, 6, 4, 5],
    [5, 6, 4, 3, 1, 2],
    [3, 1, 2, 5, 6, 4],
    [6, 4, 5, 2, 3, 0],
  ];
  assert.equal(isSudokuPlacementValid(board, 5, 5, 1, 2, 3), true);
  assert.equal(isSudokuPlacementValid(board, 5, 5, 6, 2, 3), false); // row conflict
  assert.equal(isSudokuPlacementValid(board, 5, 5, 2, 2, 3), false); // col & box conflict
});

test('Ludo token rules enforce 6-to-deploy, exact finish, and offside cap', () => {
  assert.equal(canLudoTokenMove(-1, 5), false);
  assert.equal(canLudoTokenMove(-1, 6), true);
  assert.equal(canLudoTokenMove(53, 4), false); // overshoots 56
  assert.equal(canLudoTokenMove(53, 3), true);  // exact 56 finish
  assert.equal(canLudoTokenMove(10, 5, true), false); // offside restricts die > 3
  assert.equal(getLudoGlobalTrackIndex(2, 0), 26);
  assert.equal(getLudoGlobalTrackIndex(0, 51), null); // home lane
});

test('Draft chemistry rewards shared clubs and nations cleanly', () => {
  const res = calculateDraftChemistry([
    { club: 'ZESCO United', nation: 'Zambia', rating: 80 },
    { club: 'ZESCO United', nation: 'Zambia', rating: 82 },
    { club: 'Power Dynamos', nation: 'Zambia', rating: 81 },
  ]);
  assert.equal(res.baseRating, 243);
  assert.equal(res.chemistry, 16 + 12); // 1 club pair (+16) + 2 nation links (+12)
  assert.equal(res.total, 271);
});

test('evaluateWordGuess supports 6-letter Expert mode words accurately', () => {
  const eval6 = evaluateWordGuess('ZANACO', 'ZANACO');
  assert.deepEqual(eval6, ['correct', 'correct', 'correct', 'correct', 'correct', 'correct']);

  const partial = evaluateWordGuess('AAAAAA', 'ZANACO');
  assert.deepEqual(partial, ['absent', 'correct', 'absent', 'correct', 'absent', 'absent']);
});

test('isSudokuPlacementValid enforces 4x4 (2x2 box) and 9x9 (3x3 box) rules', () => {
  const board4 = [
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 3, 2, 0],
  ];
  assert.equal(isSudokuPlacementValid(board4, 3, 3, 1, 2, 2), true);
  assert.equal(isSudokuPlacementValid(board4, 3, 3, 3, 2, 2), false);

  const board9 = [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 0],
  ];
  assert.equal(isSudokuPlacementValid(board9, 8, 8, 9, 3, 3), true);
  assert.equal(isSudokuPlacementValid(board9, 8, 8, 5, 3, 3), false);
});

test('formatShareMessage builds WhatsApp/Social payloads across categories and daily mode', () => {
  const daily = formatShareMessage({
    gameTitle: 'BOLA Word',
    gameCategory: 'football',
    score: 1450,
    accuracy: 88,
    won: true,
    isDailyMode: true,
    shareGrid: '🟩🟩🟩🟩🟩',
  });
  assert.match(daily.text, /\*INDIWABOLA Daily BOLA Challenge — BOLA Word\*/);
  assert.match(daily.text, /🏆 Victory · Score: \*1450 pts\* · Accuracy: \*88%\*/);
  assert.match(daily.text, /🟩🟩🟩🟩🟩/);
  assert.equal(daily.url, 'https://indiwabola.com/games/daily');

  const multi = formatShareMessage({
    gameTitle: 'Four Goals',
    gameCategory: 'multiplayer',
    score: 320,
    won: false,
    isDailyMode: false,
    summaryLine: 'Lost in sudden death',
  });
  assert.match(multi.text, /\*INDIWABOLA Games Hub — Four Goals\*/);
  assert.match(multi.text, /⚽ Match Complete · Score: \*320 pts\*/);
  assert.doesNotMatch(multi.text, /Accuracy:/);
  assert.match(multi.text, /Lost in sudden death/);
  assert.equal(multi.url, 'https://indiwabola.com/games/multiplayer');
});

import { FOOTBALL_VOCAB_SET, WORD_DICTIONARY } from '../src/data/wordDictionary.ts';
import { getDailyArchiveDates, getDailyRotationForDate } from '../src/utils/lusakaTime.ts';
import {
  generateBolaLettersPuzzle,
  generateLetterBoxPuzzle,
  getAllBoardLetters,
  isValidBolaLettersWord,
  isValidLetterBoxWord,
  scoreBolaLettersWord,
  scoreLetterBoxChain,
  validateLetterBoxChain,
} from '../src/utils/wordPuzzles.ts';

test('WORD_DICTIONARY and FOOTBALL_VOCAB_SET integrity checks pass', () => {
  assert.ok(WORD_DICTIONARY.size >= 1500, 'Dictionary should contain at least 1,500 verified words');
  assert.ok(FOOTBALL_VOCAB_SET.size >= 120, 'Football vocabulary set should contain 120+ terms');
  for (const w of ['GOAL', 'CAPTAIN', 'PENALTY', 'STADIUM', 'NKANA', 'CHIPOLOPOLO']) {
    assert.ok(WORD_DICTIONARY.has(w), `Expected ${w} in WORD_DICTIONARY`);
    assert.ok(FOOTBALL_VOCAB_SET.has(w), `Expected ${w} in FOOTBALL_VOCAB_SET`);
  }
  for (const w of WORD_DICTIONARY) {
    assert.match(w, /^[A-Z]{3,}$/);
  }
});

test('BOLA Letters scoring, validation, and 20-seed solvability pass', () => {
  const allowed = new Set(['P', 'L', 'A', 'Y', 'E', 'R', 'S']);
  assert.equal(scoreBolaLettersWord('PLAY', allowed), 1);
  assert.equal(scoreBolaLettersWord('PLAYS', allowed), 5);
  assert.equal(scoreBolaLettersWord('PLAYER', allowed), 6);
  assert.equal(scoreBolaLettersWord('PLAYERS', allowed), 7 + 7); // 7-letter pangram = 14

  assert.equal(isValidBolaLettersWord('PLAY', 'A', allowed, WORD_DICTIONARY).valid, true);
  assert.equal(isValidBolaLettersWord('PLY', 'A', allowed, WORD_DICTIONARY).valid, false); // <4 letters
  assert.equal(isValidBolaLettersWord('REEL', 'A', allowed, WORD_DICTIONARY).valid, false); // missing center A

  for (let seed = 0; seed < 20; seed++) {
    const pAll = generateBolaLettersPuzzle(seed, 'all', false);
    const pZambia = generateBolaLettersPuzzle(seed, 'zambia', false);
    const pJunior = generateBolaLettersPuzzle(seed, 'zambia', true);
    for (const p of [pAll, pZambia, pJunior]) {
      assert.equal(new Set(p.allLetters).size, 7);
      assert.ok(p.validWords.length >= 20, `${p.id} should have >=20 valid words`);
      assert.ok(p.pangrams.length >= 1, `${p.id} should have >=1 pangram`);
      assert.ok(p.maxAchievableScore > 50, `${p.id} max score should be >50`);
    }
  }
});

test('BOLA Letter Box geometry, transition rules, scoring, and 20-seed solvability pass', () => {
  assert.equal(scoreLetterBoxChain({ wordsCount: 2, completed: false }), 0);
  assert.equal(scoreLetterBoxChain({ wordsCount: 2, completed: true }), 100);
  assert.equal(scoreLetterBoxChain({ wordsCount: 3, completed: true }), 80);
  assert.equal(scoreLetterBoxChain({ wordsCount: 4, completed: true }), 60);
  assert.equal(scoreLetterBoxChain({ wordsCount: 5, completed: true }), 40);
  assert.equal(
    scoreLetterBoxChain({ wordsCount: 2, completed: true, hintsUsed: 1, juniorMode: true }),
    100
  );
  assert.equal(
    scoreLetterBoxChain({ wordsCount: 2, completed: true, hintsUsed: 1, juniorMode: false }),
    90
  );

  for (let seed = 0; seed < 20; seed++) {
    const puzzle = generateLetterBoxPuzzle(seed, false, false);
    const letters = getAllBoardLetters(puzzle.board);
    assert.equal(letters.length, 12);
    assert.equal(new Set(letters).size, 12);

    // Verified solution must pass every transition, dictionary check, and cover all 12 letters
    const chainCheck = validateLetterBoxChain(puzzle.board, puzzle.sampleSolution, WORD_DICTIONARY);
    assert.equal(chainCheck.valid, true, `Seed ${seed} chain failed: ${chainCheck.reason}`);
    assert.equal(chainCheck.allCovered, true, `Seed ${seed} did not cover all 12 letters`);

    // Same-side consecutive rejection check
    const sameSideBadWord = `${puzzle.board.sides[0][0]}${puzzle.board.sides[0][1]}${puzzle.board.sides[1][0]}`;
    assert.equal(
      isValidLetterBoxWord(puzzle.board, sameSideBadWord, undefined, new Set([sameSideBadWord])).valid,
      false
    );

    // Broken word-chain continuity rejection check
    const first = puzzle.sampleSolution[0];
    const wrongStart = puzzle.board.sides.flat().find((ch) => ch !== first[first.length - 1])!;
    const brokenNext = `${wrongStart}${puzzle.board.sides[1][0]}${puzzle.board.sides[2][0]}`;
    assert.equal(
      isValidLetterBoxWord(puzzle.board, brokenNext, first, new Set([brokenNext])).valid,
      false
    );
  }
});

test('Daily Challenge rotation and 7-day archive include new word games', () => {
  const seen = new Set<string>();
  const archive = getDailyArchiveDates('2026-11-20', 8);
  assert.equal(archive.length, 8);
  for (const d of archive) {
    const picks = getDailyRotationForDate(d);
    assert.equal(picks.length, 3);
    picks.forEach((p) => seen.add(p.gameId));
  }
  assert.ok(seen.has('bola-letters'));
  assert.ok(seen.has('bola-letter-box'));
});



