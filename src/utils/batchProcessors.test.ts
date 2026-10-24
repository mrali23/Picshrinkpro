import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAspectRatioCrop, formatFileSize } from './imageProcessors';

test('formatFileSize correctly formats various byte ranges', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(500), '500 B');
  assert.equal(formatFileSize(1024), '1 KB');
  assert.equal(formatFileSize(1024 * 1024 * 2.5), '2.5 MB');
});

test('calculateAspectRatioCrop calculates exact centered 1:1 square crop', () => {
  // Landscape 1200x800 -> 800x800 centered
  const crop = calculateAspectRatioCrop(1200, 800, '1:1');
  assert.equal(crop.width, 800);
  assert.equal(crop.height, 800);
  assert.equal(crop.x, 200); // (1200 - 800) / 2
  assert.equal(crop.y, 0);

  // Portrait 600x1000 -> 600x600 centered
  const cropPortrait = calculateAspectRatioCrop(600, 1000, '1:1');
  assert.equal(cropPortrait.width, 600);
  assert.equal(cropPortrait.height, 600);
  assert.equal(cropPortrait.x, 0);
  assert.equal(cropPortrait.y, 200); // (1000 - 600) / 2
});

test('calculateAspectRatioCrop calculates 16:9 widescreen crop', () => {
  // 1920x1080 is already 16:9
  const cropHD = calculateAspectRatioCrop(1920, 1080, '16:9');
  assert.equal(cropHD.width, 1920);
  assert.equal(cropHD.height, 1080);
  assert.equal(cropHD.x, 0);
  assert.equal(cropHD.y, 0);

  // 1000x1000 square -> 1000 x 563 centered
  const cropSquare = calculateAspectRatioCrop(1000, 1000, '16:9');
  assert.equal(cropSquare.width, 1000);
  assert.equal(cropSquare.height, 563);
  assert.equal(cropSquare.x, 0);
  assert.equal(cropSquare.y, 219); // (1000 - 563) / 2 = 218.5 rounded to 219
});

test('calculateAspectRatioCrop handles freeform aspect', () => {
  const cropFree = calculateAspectRatioCrop(800, 600, 'free');
  assert.equal(cropFree.width, 800);
  assert.equal(cropFree.height, 600);
  assert.equal(cropFree.x, 0);
  assert.equal(cropFree.y, 0);
});

test('perceptualColorDistance accurately measures color similarity', async () => {
  const { perceptualColorDistance } = await import('./imageProcessors');
  // Identical colors
  assert.equal(perceptualColorDistance(0, 0, 0, 0, 0, 0), 0);
  assert.equal(perceptualColorDistance(255, 255, 255, 255, 255, 255), 0);

  // Near black
  const nearBlackDist = perceptualColorDistance(5, 5, 5, 0, 0, 0);
  assert.ok(nearBlackDist < 20);

  // Black vs White
  const bwDist = perceptualColorDistance(0, 0, 0, 255, 255, 255);
  assert.ok(bwDist > 500);
});

test('detectDominantBorderColor detects dominant background even when subject touches an edge', async () => {
  const { detectDominantBorderColor } = await import('./imageProcessors');
  const width = 10;
  const height = 10;
  // 10x10 image: mostly black borders (0, 0, 0)
  // but right edge middle has a subject touch with blonde/skin color (240, 200, 160)
  const data = new Uint8Array(width * height * 4);
  // Default all to black background
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = 10;
    data[i * 4 + 1] = 10;
    data[i * 4 + 2] = 10;
    data[i * 4 + 3] = 255;
  }
  // Subject touching right border at (9, 5) and (9, 6)
  for (const y of [5, 6]) {
    const idx = (y * width + 9) * 4;
    data[idx] = 240;
    data[idx + 1] = 200;
    data[idx + 2] = 160;
  }

  const dominant = detectDominantBorderColor(data, width, height);
  // Must detect black, NOT the subject touching the border
  assert.ok(dominant.r < 30);
  assert.ok(dominant.g < 30);
  assert.ok(dominant.b < 30);
});

test('generateBackgroundAlphaMask protects enclosed subject interior and face', async () => {
  const { generateBackgroundAlphaMask } = await import('./imageProcessors');
  const width = 10;
  const height = 10;
  const data = new Uint8Array(width * height * 4);

  // Background is black (0, 0, 0)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = 0;
    data[i * 4 + 1] = 0;
    data[i * 4 + 2] = 0;
    data[i * 4 + 3] = 255;
  }

  // Draw a white subject (255, 255, 255) from x=3..6, y=3..6
  // AND place an internal black feature (like a pupil or dark shadow) at x=4, y=4
  for (let y = 3; y <= 6; y++) {
    for (let x = 3; x <= 6; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
    }
  }
  // Internal black spot inside the subject
  const pupilIdx = (4 * width + 4) * 4;
  data[pupilIdx] = 0;
  data[pupilIdx + 1] = 0;
  data[pupilIdx + 2] = 0;

  const mask = generateBackgroundAlphaMask(data, width, height, {
    targetColor: { r: 0, g: 0, b: 0 },
    tolerance: 25,
    feather: 0,
    mode: 'smart-boundary',
  });

  // 1. Exterior border pixel (0, 0) MUST be erased (mask = 0)
  assert.equal(mask[0], 0);

  // 2. White subject body at (5, 5) MUST be preserved (mask = 255)
  assert.equal(mask[5 * width + 5], 255);

  // 3. CRITICAL: The internal black feature inside the subject at (4, 4) MUST BE PROTECTED (mask = 255)!
  // Because it is surrounded by the subject and NOT reachable from the exterior perimeter!
  assert.equal(mask[4 * width + 4], 255);
});
