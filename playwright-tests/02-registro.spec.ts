/**
 * Funcionalidad 2: Registro de usuario (validación de contraseña y fecha de nacimiento).
 * Trazabilidad: docs/user-stories/v5.md -> "User Registration" AC1, AC2, AC6
 * Reglas reales (código):
 *   UI  -> sprint5/UI/src/app/auth/register/register.component.ts (PasswordValidators.minLength(8)...)
 *   API -> sprint5/API/app/Http/Requests/Customer/StoreCustomer.php
 *          'dob' => before:{hoy-18 años}, after:{hoy-75 años}
 *          mensajes: "Customer must be 18 years old." / "Customer must be younger than 75 years old."
 */
import { expect, Page, Response, test, TestInfo } from '@playwright/test';
import { RegisterPage, RegisterData } from './pages/register.page';
import { isoDateFromToday, uniqueEmail, VALID_PASSWORD } from './support/test-data';

function baseData(overrides: Partial<RegisterData>): RegisterData {
  return {
    firstName: 'Laura',
    lastName: 'Gomez',
    dob: isoDateFromToday(-30),
    country: 'CO',
    postalCode: '760001',
    houseNumber: '12',
    phone: '3001234567',
    email: uniqueEmail('registro'),
    password: VALID_PASSWORD,
    ...overrides,
  };
}

/**
 * Envía el registro y espera a que la UI muestre el resultado real (formulario de login si la cuenta
 * se creó, o el mensaje de error si se rechazó). Adjunta la respuesta de la API al reporte como evidencia.
 */
async function submitAndWaitOutcome(page: Page, registerPage: RegisterPage, testInfo: TestInfo): Promise<Response> {
  const responsePromise = page.waitForResponse((r) => r.url().includes('/users/register') && r.request().method() === 'POST');
  await registerPage.submitForm();
  const response = await responsePromise;
  // El cuerpo se lee antes de que la navegación lo descarte.
  const body = await response.text().catch(() => '(sin cuerpo)');
  await testInfo.attach('respuesta POST /users/register', { body: `HTTP ${response.status()}\n${body}`, contentType: 'text/plain' });
  await expect(page.locator('[data-test="login-form"]').or(registerPage.registerError)).toBeVisible();
  return response;
}

test.describe('F2 - Registro de usuario', () => {
  test.describe('TC-REG-001 | BVA longitud mínima de contraseña (mín. 8)', () => {
    // Todas las contraseñas cumplen mayúscula, minúscula, número y símbolo: solo varía la longitud.
    test('Valor 7 (Min-1) -> inválido: no se registra', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      await registerPage.fillForm(baseData({ password: 'Qx7!vRt' })); // 7 caracteres
      let registerRequestSent = false;
      page.on('request', (r) => { if (r.url().includes('/users/register')) registerRequestSent = true; });

      await registerPage.submitForm();

      // ER1: el formulario NO se envía y se permanece en /auth/register
      await expect(page).toHaveURL(/\/auth\/register$/);
      expect(registerRequestSent).toBe(false);
      // ER2: se muestra el bloque de error de contraseña
      await expect(registerPage.passwordError).toBeVisible();
      // ER3: el requisito "Be at least 8 characters long" NO se marca como cumplido
      await expect(registerPage.minLengthRequirement).not.toHaveClass(/text-success/);
      // ER4: el mensaje de error debe ser coherente con la regla (8 caracteres). -> ver BUG-004
      expect.soft(await registerPage.passwordError.innerText(), 'BUG-004: el mensaje debe indicar mínimo 8 caracteres')
        .toContain('8 characters');
    });

    for (const [label, password] of [
      ['Valor 8 (Min) -> válido', 'Qx7!vRtm'],
      ['Valor 9 (Min+1) -> válido', 'Qx7!vRtmz'],
    ] as const) {
      test(`${label}: la cuenta se crea y redirige a login`, async ({ page }) => {
        const registerPage = new RegisterPage(page);
        await registerPage.goto();
        await registerPage.fillForm(baseData({ password }));

        const response = await submitAndWaitOutcome(page, registerPage, test.info());

        expect(response.status()).toBe(201);
        await expect(page).toHaveURL(/\/auth\/login$/);
        await expect(registerPage.minLengthRequirement).toHaveCount(0); // ya no estamos en el formulario
      });
    }
  });

  test.describe('TC-REG-002 | BVA edad mínima 18 años (fecha de nacimiento)', () => {
    const cases = [
      { label: 'Cumplió 18 ayer (límite-1 día) -> válido', dob: () => isoDateFromToday(-18, -1), valid: true },
      { label: 'Cumple 18 HOY (valor límite) -> válido', dob: () => isoDateFromToday(-18), valid: true },
      { label: 'Cumple 18 mañana (límite+1 día) -> inválido', dob: () => isoDateFromToday(-18, 1), valid: false },
    ];

    for (const c of cases) {
      test(c.label, async ({ page }) => {
        const registerPage = new RegisterPage(page);
        await registerPage.goto();
        await registerPage.fillForm(baseData({ dob: c.dob() }));

        const response = await submitAndWaitOutcome(page, registerPage, test.info());

        if (c.valid) {
          expect(response.status(), `dob=${c.dob()} debe aceptarse`).toBe(201);
          await expect(page).toHaveURL(/\/auth\/login$/);
        } else {
          expect(response.status()).toBe(422);
          await expect(registerPage.registerError).toHaveText('Customer must be 18 years old.');
          await expect(page).toHaveURL(/\/auth\/register$/);
        }
      });
    }
  });

  test.describe('TC-REG-003 | Caja blanca: decisión "after:{hoy-75 años}" del campo dob', () => {
    // En StoreCustomer::rules() la fecha límite superior se calcula con el MISMO objeto Carbon
    // mutable que ya restó 18 años: $dt->subYears(18) ... $dt->subYears(75)  => límite real = hoy-93 años.
    // Se diseñan dos casos para ejercitar ambas salidas de la decisión según la especificación (75 años).
    test('Rama FALSE esperada: 95 años -> rechazado', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      await registerPage.fillForm(baseData({ dob: isoDateFromToday(-95) }));

      const response = await submitAndWaitOutcome(page, registerPage, test.info());

      expect(response.status()).toBe(422);
      await expect(registerPage.registerError).toHaveText('Customer must be younger than 75 years old.');
    });

    test('Rama FALSE esperada: 80 años -> debe rechazarse (revela límite desplazado)', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      await registerPage.fillForm(baseData({ dob: isoDateFromToday(-80) }));

      const response = await submitAndWaitOutcome(page, registerPage, test.info());

      // Resultado esperado según la regla de negocio del propio sistema (< 75 años): BUG-002
      expect(response.status(), 'BUG-002: un cliente de 80 años no debería poder registrarse').toBe(422);
      await expect(registerPage.registerError).toHaveText('Customer must be younger than 75 years old.');
      await expect(page).toHaveURL(/\/auth\/register$/);
    });
  });
});
