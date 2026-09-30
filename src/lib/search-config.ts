/** Shared MiniSearch options: the build script and the runtime must use identical settings (MiniSearch.loadJSON). */
export const CHUNK_INDEX_OPTIONS = {
  idField: "id",
  fields: ["title", "text"],
  storeFields: [] as string[],
  searchOptions: {
    boost: { title: 1.5 },
    fuzzy: 0.15,
    prefix: true,
    combineWith: "OR" as const,
  },
};

/** Stop words dropped from BM25 queries so natural-language questions match on content terms. */
export const STOP_WORDS = new Set(
  "a an and are as at be but by can could did do does for from had has have how i if in into is it its may might more most of on or should so than that the their them then there these they this to was we were what when where which who why will with would you your about does do happen happens".split(
    " ",
  ),
);

/** Lower-cases terms and drops stop words / 1-letter tokens (used when building and when loading the index). */
export function processTerm(term: string): string | null {
  const t = term.toLowerCase();
  return STOP_WORDS.has(t) || t.length < 2 ? null : t;
}
