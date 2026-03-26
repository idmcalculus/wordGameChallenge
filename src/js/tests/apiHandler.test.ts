import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPossibleWords, fetchWordMeaning, validateWord } from '../apiHandler';
import type { JsonValue } from '../types/types';

const originalFetch = globalThis.fetch;
type FetchImplementation = typeof fetch;

function setFetchMock(implementation: FetchImplementation): void {
  globalThis.fetch = vi.fn((...args: Parameters<typeof fetch>) => {
    return implementation(...args);
  }) as typeof fetch;
}

function createJsonResponse(payload: JsonValue, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

describe('apiHandler', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('fetchPossibleWords returns filtered words by length and frequency', async () => {
    setFetchMock(async () => createJsonResponse([
      { word: 'adage', tags: ['f:1.5'] },
      { word: 'cabin', tags: ['f:0.1'] },
      { word: 'plain' },
      { word: 'apt', tags: ['f:2.0'] },
      { word: 'again', tags: ['f:0.7'] }
    ]));

    const words = await fetchPossibleWords('?????', 5);
    expect(words).toEqual(['adage', 'again']);
  });

  it('fetchPossibleWords rejects invalid lookup patterns', async () => {
    await expect(fetchPossibleWords('abc??', 5)).rejects.toThrow('Invalid pattern supplied for word lookup');
  });

  it('fetchPossibleWords throws when no valid words are returned', async () => {
    setFetchMock(async () => createJsonResponse([
      { word: 'abc', tags: ['f:2.0'] }
    ]));

    await expect(fetchPossibleWords('?????', 5)).rejects.toThrow('Failed to fetch words');
  });

  it('fetchPossibleWords throws on non-ok response', async () => {
    setFetchMock(async () => createJsonResponse({ message: 'server error' }, 500));

    await expect(fetchPossibleWords('?????', 5)).rejects.toThrow('Failed to fetch words');
  });

  it('fetchPossibleWords ignores malformed payload entries', async () => {
    setFetchMock(async () => createJsonResponse([
      1,
      null,
      { tags: ['f:2.0'] },
      { word: 'valid', tags: [1] },
      { word: 'right', tags: ['f:0.6'] }
    ]));

    const words = await fetchPossibleWords('?????', 5);
    expect(words).toEqual(['right']);
  });

  it('fetchPossibleWords fails gracefully when payload is not an array', async () => {
    setFetchMock(async () => createJsonResponse({ value: 'not-array' }));

    await expect(fetchPossibleWords('?????', 5)).rejects.toThrow('Failed to fetch words');
  });

  it('fetchPossibleWords handles non-Error thrown values from fetch', async () => {
    setFetchMock(async () => {
      throw { code: 'ETIMEDOUT' };
    });

    await expect(fetchPossibleWords('?????', 5)).rejects.toThrow('Failed to fetch words');
  });

  it('validateWord returns false for blank input', async () => {
    expect(await validateWord('')).toBe(false);
    expect(await validateWord('   ')).toBe(false);
  });

  it('validateWord returns true for locally curated words without fetching', async () => {
    const result = await validateWord('CROWN');
    expect(result).toBe(true);
    expect(globalThis.fetch).toBe(originalFetch);
  });

  it('validateWord returns true when Datamuse exact match exists', async () => {
    setFetchMock(async () => createJsonResponse([
      { word: 'quell', tags: ['f:1.2'] }
    ]));

    const result = await validateWord('QUELL');
    expect(result).toBe(true);
    expect(vi.mocked(globalThis.fetch).mock.calls).toHaveLength(1);
  });

  it('validateWord falls back to Free Dictionary when Datamuse has no exact match', async () => {
    const responses: Response[] = [
      createJsonResponse([{ word: 'quells', tags: ['f:1.2'] }]),
      createJsonResponse([{ meaning: 'ok' }], 200)
    ];

    let callIndex = 0;
    setFetchMock(async () => {
      const response = responses[callIndex];
      callIndex += 1;
      return response;
    });

    const result = await validateWord('quell');
    expect(result).toBe(true);
    expect(vi.mocked(globalThis.fetch).mock.calls).toHaveLength(2);
  });

  it('validateWord returns false when fallback dictionary returns 404', async () => {
    const responses: Response[] = [
      createJsonResponse([], 200),
      createJsonResponse({ title: 'No Definitions Found' }, 404)
    ];

    let callIndex = 0;
    setFetchMock(async () => {
      const response = responses[callIndex];
      callIndex += 1;
      return response;
    });

    const result = await validateWord('quell');
    expect(result).toBe(false);
  });

  it('validateWord handles non-ok Datamuse responses by falling back', async () => {
    const responses: Response[] = [
      createJsonResponse({ message: 'bad gateway' }, 502),
      createJsonResponse({ title: 'No Definitions Found' }, 404)
    ];

    let callIndex = 0;
    setFetchMock(async () => {
      const response = responses[callIndex];
      callIndex += 1;
      return response;
    });

    const result = await validateWord('quell');
    expect(result).toBe(false);
  });

  it('validateWord handles non-Error thrown values from fetch', async () => {
    let callIndex = 0;
    setFetchMock(async () => {
      callIndex += 1;
      if (callIndex === 1) {
        throw 'network down';
      }
      return createJsonResponse({ title: 'Not found' }, 404);
    });

    const result = await validateWord('quell');
    expect(result).toBe(false);
  });

  it('validateWord returns true when both APIs fail to avoid blocking gameplay', async () => {
    let callIndex = 0;
    setFetchMock(async () => {
      callIndex += 1;
      throw new Error(`Network failure ${callIndex}`);
    });

    const result = await validateWord('quell');
    expect(result).toBe(true);
    expect(vi.mocked(globalThis.fetch).mock.calls).toHaveLength(2);
  });

  it('fetchWordMeaning returns the first available definition', async () => {
    setFetchMock(async () => createJsonResponse([
      {
        meanings: [
          {
            definitions: [
              { definition: 'To quiet or suppress something.' }
            ]
          }
        ]
      }
    ]));

    await expect(fetchWordMeaning('QUELL')).resolves.toBe('To quiet or suppress something.');
  });

  it('fetchWordMeaning skips malformed dictionary records until it finds a usable definition', async () => {
    setFetchMock(async () => createJsonResponse([
      null,
      { meanings: 'bad-data' },
      {
        meanings: [
          null,
          { definitions: 'wrong-shape' },
          {
            definitions: [
              null,
              { definition: 42 },
              { definition: '   ' }
            ]
          },
          {
            definitions: [
              { definition: 'A calm or settled state.' }
            ]
          }
        ]
      }
    ]));

    await expect(fetchWordMeaning('calm')).resolves.toBe('A calm or settled state.');
  });

  it('fetchWordMeaning returns null for blank words, missing definitions, and fetch failures', async () => {
    expect(await fetchWordMeaning('   ')).toBeNull();

    setFetchMock(async () => createJsonResponse({ title: 'No Definitions Found' }, 404));
    expect(await fetchWordMeaning('quell')).toBeNull();

    setFetchMock(async () => createJsonResponse({ meanings: [] }));
    expect(await fetchWordMeaning('quell')).toBeNull();

    setFetchMock(async () => createJsonResponse([
      {
        meanings: [
          {
            definitions: [
              { definition: '   ' }
            ]
          }
        ]
      }
    ]));
    expect(await fetchWordMeaning('quell')).toBeNull();

    setFetchMock(async () => {
      throw new Error('dictionary unavailable');
    });
    expect(await fetchWordMeaning('quell')).toBeNull();
  });
});
