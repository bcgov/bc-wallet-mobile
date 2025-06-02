export const splitSplice = (str: string, index: number, count: number, add: string): string => {
  const ar = str.split('');
  ar.splice(index, count, add);
  return ar.join('');
}
