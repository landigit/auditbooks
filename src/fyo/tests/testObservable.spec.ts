import { assertThrows } from 'tests/testHelpers';
import Observable from 'fyo/utils/observable';
import { describe, expect, test } from 'vite-plus/test';

enum ObsEvent {
  A = 'event-a',
  B = 'event-b',
}

describe('Observable Tests', () => {
  const obs = new Observable();
  let counter = 0;
  const params = { aOne: 18, aTwo: 21, b: 42 };

  const listenerAOnce = (value: number) => {
    expect(value).toBe(params.aOne);
  };

  const listenerAEvery = (value: number) => {
    if (counter === 0) {
      expect(value).toBe(params.aOne);
    } else if (counter === 1) {
      expect(value).toBe(params.aTwo);
    } else {
      throw new Error("this shouldn't run");
    }
    counter += 1;
  };

  const listenerBOnce = (value: number) => {
    expect(value).toBe(params.b);
  };

  test('set A One', () => {
    expect(obs.hasListener(ObsEvent.A)).toBe(false);

    obs.once(ObsEvent.A, listenerAOnce);
    expect(obs.hasListener(ObsEvent.A)).toBe(true);
    expect(obs.hasListener(ObsEvent.A, listenerAOnce)).toBe(true);
    expect(obs.hasListener(ObsEvent.A, listenerAEvery)).toBe(false);
  });

  test('set A Two', () => {
    obs.on(ObsEvent.A, listenerAEvery);
    expect(obs.hasListener(ObsEvent.A)).toBe(true);
    expect(obs.hasListener(ObsEvent.A, listenerAOnce)).toBe(true);
    expect(obs.hasListener(ObsEvent.A, listenerAEvery)).toBe(true);
  });

  test('set B', () => {
    expect(obs.hasListener(ObsEvent.B)).toBe(false);

    obs.once(ObsEvent.B, listenerBOnce);
    expect(obs.hasListener(ObsEvent.A, listenerBOnce)).toBe(false);
    expect(obs.hasListener(ObsEvent.B, listenerBOnce)).toBe(true);
  });

  test('trigger A 0', async () => {
    await obs.trigger(ObsEvent.A, params.aOne);
    expect(obs.hasListener(ObsEvent.A)).toBe(true);
    expect(obs.hasListener(ObsEvent.A, listenerAOnce)).toBe(false);
  });

  test('trigger A 1', async () => {
    expect(obs.hasListener(ObsEvent.A, listenerAEvery)).toBe(true);
    await obs.trigger(ObsEvent.A, params.aTwo);
    expect(obs.hasListener(ObsEvent.A, listenerAEvery)).toBe(true);
  });

  test('trigger B', async () => {
    expect(obs.hasListener(ObsEvent.B, listenerBOnce)).toBe(true);
    await obs.trigger(ObsEvent.B, params.b);
    expect(obs.hasListener(ObsEvent.B, listenerBOnce)).toBe(false);
  });

  test('remove A', async () => {
    obs.off(ObsEvent.A, listenerAEvery);
    expect(obs.hasListener(ObsEvent.A, listenerAEvery)).toBe(false);

    expect(counter).toBe(2);
    await obs.trigger(ObsEvent.A, 777);
  });

  test('observable trigger error propagation', async () => {
    const obs = new Observable();
    obs.on('testOne', () => {
      throw new Error('stuff');
    });

    await assertThrows(async () => {
      await obs.trigger('testOne');
    });
  });
});
