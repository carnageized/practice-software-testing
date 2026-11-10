// Copia la captura final de cada caso ejecutado a evidencias/capturas/ con el ID del caso
// y genera evidencias/resultados-ejecucion.csv a partir de test-results/results.json.
// Uso: npm run evidencias   (después de npm test)
import fs from 'node:fs';
import path from 'node:path';

const results = JSON.parse(fs.readFileSync('test-results/results.json', 'utf8'));
const outDir = 'evidencias/capturas';
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const rows = [['ID caso', 'Escenario / dato', 'Navegador', 'Resultado', 'Duración (ms)', 'Evidencia']];
const slug = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');

function walk(suite, titles) {
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests) {
      const r = t.results.at(-1);
      const full = [...titles, spec.title].join(' > ');
      const tc = full.match(/TC-[A-Z]+-\d+/)?.[0] ?? 'SIN-ID';
      const scenario = titles.at(-1)?.startsWith('TC-') ? spec.title : '';
      const key = scenario ? '_' + slug(scenario.split(/:| -> /)[0]).slice(0, 40) : '';
      const status = r.status === 'passed' ? 'PASS' : 'FAIL';
      const shot = r.attachments.find((a) => a.name === 'screenshot')?.path;
      const name = `${tc}${key}_${t.projectName}_${status}.png`;
      if (shot) fs.copyFileSync(shot, path.join(outDir, name));
      rows.push([tc, scenario || spec.title.split(' | ')[1] || spec.title, t.projectName, status, r.duration, shot ? `${outDir}/${name}` : '']);
    }
  }
  for (const child of suite.suites ?? []) walk(child, [...titles, child.title]);
}
for (const s of results.suites) walk(s, []);

const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
fs.writeFileSync('evidencias/resultados-ejecucion.csv', '﻿' + csv);
const pass = rows.filter((r) => r[3] === 'PASS').length;
console.log(`Evidencias: ${rows.length - 1} ejecuciones (${pass} PASS / ${rows.length - 1 - pass} FAIL) -> ${outDir}`);
