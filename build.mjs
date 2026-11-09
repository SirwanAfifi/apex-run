import {readFile, writeFile} from 'node:fs/promises';
import {Script} from 'node:vm';
import {createHash} from 'node:crypto';

const modules = ['motorcycles', 'coast', 'london', 'world-model', 'environment', 'scenery', 'rider-weather', 'collision-fx', 'rivals', 'bike-garage', 'mirrors', 'bike', 'collision', 'race', 'engine', 'motion', 'touch', 'telemetry', 'ui'];
const parts = await Promise.all(modules.map(async name => {
  const source = await readFile(new URL('./src/' + name + '.js', import.meta.url), 'utf8');
  new Script(source, {filename:name + '.js'});
  return '/* ' + name + '.js */\n' + source;
}));
const bundle = parts.join('\n;\n');
new Script(bundle, {filename:'game.js'});
await writeFile(new URL('./dist/game.js', import.meta.url), bundle);
// A normal refresh must fetch the current gameplay code and interface styles.
const stamp = text => createHash('sha256').update(text).digest('hex').slice(0,12);
const css = await readFile(new URL('./dist/style.css', import.meta.url), 'utf8');
const pageURL = new URL('./dist/index.html', import.meta.url);
let page = await readFile(pageURL, 'utf8');
page = page.replace(/src="game\.js(?:\?v=[^"]*)?"/, 'src="game.js?v=' + stamp(bundle) + '"')
  .replace(/href="style\.css(?:\?v=[^"]*)?"/, 'href="style.css?v=' + stamp(css) + '"');
await writeFile(pageURL, page);
