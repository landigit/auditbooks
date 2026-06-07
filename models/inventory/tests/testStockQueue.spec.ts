import { expect, test } from 'vitest';
import { StockQueue } from '../stockQueue';

test('stockQueue:initialization', () => {
  const q = new StockQueue();

  expect(q.quantity).toBe(0);
  expect(q.value).toBe(0);
  expect(q.queue.length).toBe(0);
});

test('stockQueue:operations', () => {
  const q = new StockQueue();

  expect(q.inward(100, 4)).toBe(100);
  expect(q.fifo).toBe(100);
  expect(q.movingAverage).toBe(100);
  expect(q.queue.length).toBe(1);
  expect(q.quantity).toBe(4);
  expect(q.value).toBe(400);

  expect(q.inward(200, 8)).toBe(200);
  expect(q.fifo).toBe((400 + 1600) / 12);
  expect(q.movingAverage).toBe((400 + 1600) / 12);
  expect(q.queue.length).toBe(2);
  expect(q.quantity).toBe(4 + 8);
  expect(q.value).toBe(400 + 1600);

  expect(q.inward(300, 3)).toBe(300);
  expect(q.fifo).toBe((400 + 1600 + 900) / 15);
  expect(q.movingAverage).toBe((400 + 1600 + 900) / 15);
  expect(q.queue.length).toBe(3);
  expect(q.quantity).toBe(4 + 8 + 3);
  expect(q.value).toBe(400 + 1600 + 900);

  expect(q.outward(3)).toBe(100);
  expect(q.fifo).toBe((100 + 1600 + 900) / 12);
  expect(q.movingAverage).toBe((400 + 1600 + 900) / 15);
  expect(q.queue.length).toBe(3);
  expect(q.quantity).toBe(1 + 8 + 3);
  expect(q.value).toBe(100 + 1600 + 900);

  expect(q.outward(5)).toBe((100 + 800) / 5);
  expect(q.fifo).toBe((800 + 900) / 7);
  expect(q.movingAverage).toBe((400 + 1600 + 900) / 15);
  expect(q.queue.length).toBe(2);
  expect(q.quantity).toBe(4 + 3);
  expect(q.value).toBe(800 + 900);

  expect(q.outward(4)).toBe(200);
  expect(q.fifo).toBe(900 / 3);
  expect(q.movingAverage).toBe((400 + 1600 + 900) / 15);
  expect(q.queue.length).toBe(1);
  expect(q.quantity).toBe(3);
  expect(q.value).toBe(900);

  expect(q.outward(3)).toBe(300);
  expect(q.fifo).toBe(0);
  expect(q.movingAverage).toBe((400 + 1600 + 900) / 15);
  expect(q.queue.length).toBe(0);
  expect(q.quantity).toBe(0);
  expect(q.value).toBe(0);

  expect(q.inward(100, 1)).toBe(100);
  expect(q.fifo).toBe(100);
  expect(q.movingAverage).toBe(100);
  expect(q.queue.length).toBe(1);
  expect(q.quantity).toBe(1);
  expect(q.value).toBe(100);

  expect(q.inward(150, 1)).toBe(150);
  expect(q.fifo).toBe((100 + 150) / 2);
  expect(q.movingAverage).toBe((100 + 150) / 2);
  expect(q.queue.length).toBe(2);
  expect(q.quantity).toBe(2);
  expect(q.value).toBe(100 + 150);

  expect(q.inward(100, 1)).toBe(100);
  expect(q.fifo).toBe((100 + 150 + 100) / 3);
  expect(q.movingAverage).toBe((100 + 150 + 100) / 3);
  expect(q.queue.length).toBe(3);
  expect(q.quantity).toBe(3);
  expect(q.value).toBe(100 + 150 + 100);

  expect(q.outward(1)).toBe(100);
  expect(q.fifo).toBe((150 + 100) / 2);
  expect(q.movingAverage).toBe((100 + 150 + 100) / 3);
  expect(q.queue.length).toBe(2);
  expect(q.quantity).toBe(2);
  expect(q.value).toBe(150 + 100);

  expect(q.outward(2)).toBe((150 + 100) / 2);
  expect(q.fifo).toBe(0);
  expect(q.movingAverage).toBe((100 + 150 + 100) / 3);
  expect(q.queue.length).toBe(0);
  expect(q.quantity).toBe(0);
  expect(q.value).toBe(0);
});

test('stockQueue:invalidOperations', () => {
  const q = new StockQueue();

  expect(q.outward(1)).toBe(null);
  expect(q.outward(0)).toBe(null);
  expect(q.outward(-5)).toBe(null);

  expect(q.inward(1000, -1)).toBe(null);
  expect(q.inward(0, 0)).toBe(null);
  expect(q.inward(-0.1, 5)).toBe(null);
});
