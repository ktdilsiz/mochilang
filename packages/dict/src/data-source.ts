/** Pure dictionary data boundary. Apps register one source before lookup. */
export type DictionaryDataSource = {
  getChineseData: () => Record<string, string[]>[];
  getJapaneseRows: () => unknown[];
  getBilingualData: (pair: string) => Record<string, string[]> | null;
};
let source: DictionaryDataSource | undefined;
export function configureDictionaryData(next: DictionaryDataSource) {
  if (source && source !== next) throw new Error('Dictionary data source is already configured');
  source = next;
}
function configured() {
  if (!source) throw new Error('Configure dictionary data before looking up words');
  return source;
}
export const getChineseData = () => configured().getChineseData();
export const getJapaneseRows = () => configured().getJapaneseRows();
export const getBilingualData = (pair: string) => configured().getBilingualData(pair);
