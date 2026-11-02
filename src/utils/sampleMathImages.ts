/**
 * Sample math images for testing and quick-start:
 * 1. Printed quadratic equation (3x² - 5x + 2 = 0)
 * 2. Handwritten fraction arithmetic (3/4 + 2/3)
 * 3. Trigonometric expression (sin(30°) + cos(60°))
 * 4. Geometry word problem (Area & perimeter of right triangle with legs 6 cm and 8 cm)
 * 5. Blurry / unreadable image to test safe handling
 */

export interface SampleMathImage {
  id: string;
  title: string;
  type: string;
  description: string;
  expectedMath: string;
  dataUrl: string;
}

export function generateSampleMathImages(): SampleMathImage[] {
  if (typeof document === 'undefined') return [];

  const createCard = (
    width: number,
    height: number,
    drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  ): string => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    drawFn(ctx, width, height);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  // 1. Printed Quadratic Equation
  const printedQuadratic = createCard(800, 340, (ctx, w, h) => {
    // White paper with subtle subtle grid lines
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Subtle textbook header
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Problem 14. Find all real solutions to:', 40, 60);

    // Equation
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 44px "JetBrains Mono", monospace';
    ctx.fillText('3x² - 5x + 2 = 0', 70, 160);

    // Note
    ctx.fillStyle = '#64748b';
    ctx.font = '16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Show full quadratic derivation and discriminant Δ.', 40, 240);
  });

  // 2. Handwritten Fraction Arithmetic
  const handwrittenFraction = createCard(800, 340, (ctx, w, h) => {
    // Lined notebook paper background
    ctx.fillStyle = '#fffdf7';
    ctx.fillRect(0, 0, w, h);

    // Blue notebook lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    for (let y = 60; y < h; y += 45) {
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(w - 30, y);
      ctx.stroke();
    }

    // Red left margin line
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(90, 0);
    ctx.lineTo(90, h);
    ctx.stroke();

    // Handwritten style drawing
    ctx.fillStyle = '#1e3a8a'; // Blue ink
    ctx.font = 'italic 50px "Brush Script MT", "Caveat", "Comic Sans MS", cursive, sans-serif';
    ctx.fillText('3', 170, 130);
    ctx.fillText('4', 170, 210);

    // Fraction bar 1
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(150, 145);
    ctx.lineTo(215, 145);
    ctx.stroke();

    // Plus sign
    ctx.fillText('+', 250, 175);

    // Fraction 2
    ctx.fillText('2', 330, 130);
    ctx.fillText('3', 330, 210);

    // Fraction bar 2
    ctx.beginPath();
    ctx.moveTo(310, 145);
    ctx.lineTo(375, 145);
    ctx.stroke();

    ctx.fillText('=', 420, 175);
    ctx.fillText('?', 480, 175);
  });

  // 3. Trigonometric Expression
  const trigExpression = createCard(800, 340, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#334155';
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Evaluate the exact trigonometric value:', 40, 60);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 42px "JetBrains Mono", monospace';
    ctx.fillText('sin(30°) + cos(60°)', 70, 160);

    ctx.fillStyle = '#64748b';
    ctx.font = '16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Give exact fractional result.', 40, 240);
  });

  // 4. Geometry Word Problem
  const geometryProblem = createCard(800, 360, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Geometry Exercise:', 40, 50);

    ctx.font = '18px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('A right-angled triangle has leg lengths of 6 cm and 8 cm.', 40, 95);
    ctx.fillText('1. Find the length of the hypotenuse.', 40, 135);
    ctx.fillText('2. Calculate the area and perimeter of the triangle.', 40, 175);

    // Draw triangle illustration
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(560, 280);
    ctx.lineTo(720, 280); // base (8)
    ctx.lineTo(560, 160); // vertical (6)
    ctx.closePath();
    ctx.stroke();

    // Right angle square
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(560, 260, 20, 20);

    ctx.fillStyle = '#4f46e5';
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.fillText('6 cm', 510, 220);
    ctx.fillText('8 cm', 630, 310);
    ctx.fillText('c = ?', 660, 200);
  });

  // 5. Blurry / Unreadable image
  const blurryImage = createCard(800, 340, (ctx, w, h) => {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    // Smudged blurred lines
    ctx.fillStyle = '#cbd5e1';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc(
        100 + Math.random() * 600,
        80 + Math.random() * 180,
        30 + Math.random() * 40,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 20px sans-serif';
    ctx.fillText('[Indecipherable smudged handwriting test]', 200, 170);
  });

  return [
    {
      id: 'printed-quadratic',
      title: 'Printed Quadratic Equation',
      type: 'Printed Textbook',
      description: '3x² - 5x + 2 = 0 with derivation',
      expectedMath: '3x^2 - 5x + 2 = 0',
      dataUrl: printedQuadratic,
    },
    {
      id: 'handwritten-fraction',
      title: 'Handwritten Fraction',
      type: 'Notebook Ink',
      description: '3/4 + 2/3 addition & simplification',
      expectedMath: '3/4 + 2/3',
      dataUrl: handwrittenFraction,
    },
    {
      id: 'trig-expression',
      title: 'Trigonometric Expression',
      type: 'Exam Problem',
      description: 'sin(30°) + cos(60°)',
      expectedMath: 'sin(30°) + cos(60°)',
      dataUrl: trigExpression,
    },
    {
      id: 'geometry-word-problem',
      title: 'Geometry Right Triangle',
      type: 'Word Problem & Diagram',
      description: 'Legs 6 cm and 8 cm: hypotenuse, area, perimeter',
      expectedMath: 'Right triangle with legs 6 and 8. Find hypotenuse, area, perimeter.',
      dataUrl: geometryProblem,
    },
    {
      id: 'blurry-test',
      title: 'Blurry / Unreadable Test',
      type: 'Edge Case Safety',
      description: 'Tests safe symbol detection and user confirmation',
      expectedMath: 'Unreadable test',
      dataUrl: blurryImage,
    },
  ];
}
