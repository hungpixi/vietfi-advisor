import { getAllStaticResponses } from '../src/lib/scripted-responses';
import { writeFileSync } from 'fs';
import { join } from 'path';

const responses = getAllStaticResponses();
const outPath = join(process.cwd(), 'scripts', 'static_responses.json');
writeFileSync(outPath, JSON.stringify(responses, null, 2));
console.log(`Exported ${responses.length} responses to ${outPath}`);
