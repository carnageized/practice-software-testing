// Datos de prueba y utilidades compartidas por los casos del examen.
// Las fechas se calculan dinámicamente (no se "quemen" en el código) para que los
// valores límite sigan siendo válidos sin importar el día en que se ejecute la suite.
import { APIRequestContext, expect } from '@playwright/test';

export const API_URL = process.env.API_URL ?? 'http://localhost:8091';

/** Cuentas sembradas por el seeder del Sprint 5 (ver README del repositorio original). */
export const SEED_USERS = {
  customer: { email: 'customer@practicesoftwaretesting.com', password: 'welcome01', fullName: 'Jane Doe' },
  customer2: { email: 'customer2@practicesoftwaretesting.com', password: 'welcome01', fullName: 'Jack Howe' },
  customer3: { email: 'customer3@practicesoftwaretesting.com', password: 'pass123', fullName: 'Bob Smith' },
  admin: { email: 'admin@practicesoftwaretesting.com', password: 'welcome01', fullName: 'John Doe' },
} as const;

/** Contraseña que cumple las 4 reglas (>= 8, mayúscula+minúscula, número, símbolo). */
export const VALID_PASSWORD = 'Qx!9zLm#Tr42';

/** Correo único por ejecución para que cada caso sea independiente y repetible. */
export function uniqueEmail(prefix: string): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}.${Date.now()}${rnd}@qa-examen.test`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Fecha de hoy (UTC, igual que el servidor de la API) desplazada N años y M días, formato YYYY-MM-DD. */
export function isoDateFromToday(years: number, days = 0): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear() + years, now.getUTCMonth(), now.getUTCDate() + days));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Mes de vencimiento de tarjeta en formato MM/YYYY relativo al mes actual. */
export function expiryFromCurrentMonth(monthOffset: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  return `${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Precondición: crea un cliente nuevo directamente por la API (POST /users/register).
 * Se usa en los casos que modifican el estado de la cuenta (p. ej. el bloqueo),
 * para no contaminar las cuentas sembradas compartidas.
 */
export async function registerCustomerViaApi(request: APIRequestContext, email: string, password = VALID_PASSWORD) {
  const response = await request.post(`${API_URL}/users/register`, {
    headers: { Accept: 'application/json' },
    data: {
      first_name: 'Qa',
      last_name: 'Examen',
      dob: isoDateFromToday(-30),
      phone: '3001234567',
      email,
      password,
      address: { street: 'Calle 5 # 10-20', city: 'Cali', state: 'Valle', country: 'CO', postal_code: '760001' },
    },
  });
  expect(response.status(), 'precondición: el usuario de prueba debe crearse (201)').toBe(201);
  return { email, password };
}
