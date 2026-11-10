// Copyright (c) 2024-2026 Testsmith. All rights reserved.
// See LICENSE for details.
//
// Configuración adaptada para el Examen Final de Pruebas y Calidad de Software (ECCI 2026-II).
// - Los casos del examen viven en ./playwright-tests
// - BASE_URL / API_URL permiten apuntar a otro ambiente sin tocar el código.

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './playwright-tests',
  /* Los specs se ejecutan en paralelo; cada caso crea sus propios datos para ser independiente. */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  /* Sin reintentos: un FAIL debe verse como FAIL (evidencia honesta del defecto). */
  retries: 0,
  workers: process.env.CI ? 1 : 3,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    /* Opcionales: ejecutar con --project=firefox o --project=webkit */
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
