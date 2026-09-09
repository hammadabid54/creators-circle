import { unstable_cache } from 'next/cache';
import { searchCreators } from './discovery-search';
import { filterSchema } from './discovery-taxonomy';
// Only approved route templates use this cache; arbitrary text searches and saved IDs do not.
export const cachedLandingResults = unstable_cache(
  async (serialized: string) => searchCreators(filterSchema.parse(JSON.parse(serialized)), true),
  ['discovery-landings-ranked-v2'],
  { revalidate: 300, tags: ['discovery'] },
);
