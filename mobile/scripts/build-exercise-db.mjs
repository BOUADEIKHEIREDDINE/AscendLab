// Builds src/data/exercise-db.json from free-exercise-db (Unlicense) at a pinned commit.
// Run by hand: node scripts/build-exercise-db.mjs
// Change COMMIT on purpose only: the app's photo URLs use the same commit.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMMIT = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5';
const URL = `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${COMMIT}/dist/exercises.json`;
// Gym exercises only. Cardio waits for logging types (time, distance); stretching and strongman are left out.
const CATEGORIES = new Set(['strength', 'powerlifting', 'olympic weightlifting', 'plyometrics']);
const FIELDS = ['id', 'name', 'category', 'level', 'equipment', 'primaryMuscles', 'secondaryMuscles', 'instructions', 'images'];

const res = await fetch(URL);
if (!res.ok) throw new Error(`Download failed: ${res.status} ${URL}`);
const all = await res.json();
const exercises = all
  .filter((x) => CATEGORIES.has(x.category))
  .map((x) => Object.fromEntries(FIELDS.map((f) => [f, x[f] ?? null])))
  .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'exercise-db.json');
const file = { source: 'github.com/yuhonas/free-exercise-db', commit: COMMIT, license: 'Unlicense', exercises };
writeFileSync(out, JSON.stringify(file) + '\n');
console.log(`Wrote ${exercises.length} exercises to ${out}`);
