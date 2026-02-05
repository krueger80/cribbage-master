export function deepCopy<T>(source: T): T {
  if (source === null || typeof source !== 'object') {
    return source;
  }

  if (source instanceof Date) {
    return new Date(source.getTime()) as any;
  }

  if (source instanceof Array) {
    const a = [];
    for (let i = 0; i < source.length; i++) {
      a[i] = deepCopy(source[i]);
    }
    return a as any;
  }

  if (source instanceof Object) {
    const o: { [key: string]: any } = {};
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        o[key] = deepCopy((source as any)[key]);
      }
    }
    return o as any;
  }

  throw new Error(`Unable to copy source: ${source}`);
}
