// Small text helpers shared by components.
export const shortVenue = (venue: string) => venue.replace(/\s*\([^)]*\)\s*$/, '');
export const regionName = (r: string) => (r === 'CA' ? 'California' : r);
