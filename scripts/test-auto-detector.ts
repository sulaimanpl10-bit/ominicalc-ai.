import { detectAndSolveDeterministically } from '../src/utils/autoDetector';

interface TestCase {
  query: string;
  expectedMode: string;
  expectedAnswerSubstring?: string;
}

const testCases: TestCase[] = [
  {
    query: '25% of 800',
    expectedMode: 'percentage',
    expectedAnswerSubstring: '200',
  },
  {
    query: 'Solve 3x + 7 = 22',
    expectedMode: 'equations',
    expectedAnswerSubstring: 'x = 5',
  },
  {
    query: 'Convert 10 km to miles',
    expectedMode: 'unit-converter',
    expectedAnswerSubstring: '6.2137',
  },
  {
    query: 'sin(30°)',
    expectedMode: 'scientific',
    expectedAnswerSubstring: '0.5',
  },
  {
    query: 'What is the area of a circle with radius 5?',
    expectedMode: 'geometry',
    expectedAnswerSubstring: '78.5398',
  },
  // Additional comprehensive tests
  {
    query: 'mean of 14, 28, 35, 42, 56',
    expectedMode: 'statistics',
    expectedAnswerSubstring: '35',
  },
  {
    query: '3/4 + 2/3',
    expectedMode: 'fractions',
    expectedAnswerSubstring: '17/12',
  },
  {
    query: 'x^2 - 5x + 6 = 0',
    expectedMode: 'equations',
    expectedAnswerSubstring: 'x₁ = 3',
  },
  {
    query: '5!',
    expectedMode: 'scientific',
    expectedAnswerSubstring: '120',
  },
];

let failed = 0;
console.log('--- RUNNING AUTO DETECTOR TEST SUITE ---');

for (const t of testCases) {
  const result = detectAndSolveDeterministically(t.query);
  if (!result) {
    console.error(`❌ FAILED: "${t.query}" returned null (no detection)`);
    failed++;
    continue;
  }

  const modeMatch = result.detectedMode === t.expectedMode;
  const answerMatch = !t.expectedAnswerSubstring || result.finalAnswer.includes(t.expectedAnswerSubstring);

  if (modeMatch && answerMatch) {
    console.log(`✅ PASSED: "${t.query}" → [${result.modeName}] (Answer: "${result.finalAnswer}")`);
  } else {
    console.error(
      `❌ FAILED: "${t.query}"\n` +
      `   Expected mode: ${t.expectedMode}, got: ${result.detectedMode}\n` +
      `   Expected answer to contain: "${t.expectedAnswerSubstring}", got: "${result.finalAnswer}"`
    );
    failed++;
  }
}

if (failed === 0) {
  console.log(`\n🎉 ALL ${testCases.length} TESTS PASSED PERFECTLY!`);
  process.exit(0);
} else {
  console.error(`\n❌ ${failed} TESTS FAILED.`);
  process.exit(1);
}
