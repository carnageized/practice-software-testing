/**
 * Funcionalidad 1: Autenticación (login) y bloqueo de cuenta por intentos fallidos.
 * Trazabilidad: docs/user-stories/v5.md -> "User Login" AC2, AC3, AC4, AC5
 *               _user-stories/sprint0/us-login.md (escenarios de error)
 * Código analizado (caja blanca): sprint5/API/app/Services/UserService.php -> login(),
 *               incrementLoginAttempts(), MAX_LOGIN_ATTEMPTS = 3
 */
import { expect, test } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { registerCustomerViaApi, SEED_USERS, uniqueEmail } from './support/test-data';

const INVALID_CREDENTIALS_MSG = 'Invalid email or password';
const LOCKED_MSG = 'Account locked, too many failed attempts. Please contact the administrator.';

test.describe('F1 - Login y bloqueo de cuenta', () => {
  test('TC-LOGIN-001 | EP válida: cliente registrado inicia sesión con credenciales correctas', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const response = await loginPage.loginAndCaptureResponse(SEED_USERS.customer.email, SEED_USERS.customer.password);

    // ER1: la API emite token (HTTP 200)
    expect(response.status()).toBe(200);
    // ER2: el usuario con rol "user" es redirigido a /account
    await expect(page).toHaveURL(/\/account$/);
    // ER3: se muestra el título "My account"
    await expect(page.locator('[data-test="page-title"]')).toHaveText('My account');
    // ER4: el menú de navegación muestra el nombre del usuario autenticado
    await expect(page.locator('[data-test="nav-menu"]')).toContainText(SEED_USERS.customer.fullName);
  });

  test.describe('TC-LOGIN-002 | EP inválida: credenciales rechazadas', () => {
    test('Partición I1 - email registrado + contraseña incorrecta', async ({ page, request }) => {
      const user = await registerCustomerViaApi(request, uniqueEmail('login-i1'));
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      const response = await loginPage.loginAndCaptureResponse(user.email, 'Wrong#Pass1');

      expect(response.status()).toBe(401);
      await expect(loginPage.loginError).toHaveText(INVALID_CREDENTIALS_MSG);
      await expect(page).toHaveURL(/\/auth\/login$/);
      await expect(page.locator('[data-test="nav-sign-in"]')).toBeVisible(); // no se creó sesión
    });

    test('Partición I2 - email con formato válido pero no registrado', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      const response = await loginPage.loginAndCaptureResponse(uniqueEmail('no-existe'), 'Qx!9zLm#Tr42');

      expect(response.status()).toBe(401);
      await expect(loginPage.loginError).toHaveText(INVALID_CREDENTIALS_MSG);
      await expect(page).toHaveURL(/\/auth\/login$/);
      await expect(page.locator('[data-test="nav-sign-in"]')).toBeVisible();
    });

    test('Partición I3 - email con formato inválido (validación en cliente)', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      let loginRequestSent = false;
      page.on('request', (r) => { if (r.url().includes('/users/login')) loginRequestSent = true; });

      await loginPage.login('customer.practicesoftwaretesting.com', 'welcome01');

      await expect(loginPage.emailError).toHaveText('Email format is invalid');
      await expect(page).toHaveURL(/\/auth\/login$/);
      expect(loginRequestSent, 'no debe enviarse la petición al backend').toBe(false);
    });
  });

  test('TC-LOGIN-003 | Transición de estados: la cuenta se bloquea tras 3 intentos fallidos consecutivos', async ({ page, request }) => {
    // Precondición: cliente nuevo (estado S0: failed_login_attempts = 0)
    const user = await registerCustomerViaApi(request, uniqueEmail('lock'));
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // S0 -> S1 -> S2 -> S3 : tres contraseñas incorrectas
    for (let attempt = 1; attempt <= 3; attempt++) {
      await test.step(`Intento fallido #${attempt}`, async () => {
        const response = await loginPage.loginAndCaptureResponse(user.email, `Wrong#Pass${attempt}`);
        expect(response.status()).toBe(401);
        await expect(loginPage.loginError).toHaveText(INVALID_CREDENTIALS_MSG);
      });
    }

    // S3 (bloqueada): incluso con la contraseña CORRECTA el acceso se rechaza con HTTP 423
    await test.step('Intento #4 con contraseña correcta sobre cuenta bloqueada', async () => {
      const response = await loginPage.loginAndCaptureResponse(user.email, user.password);
      expect(response.status()).toBe(423);
      await expect(loginPage.loginError).toHaveText(LOCKED_MSG);
      await expect(page).toHaveURL(/\/auth\/login$/);
      await expect(page.locator('[data-test="nav-sign-in"]')).toBeVisible();
    });
  });

  test('TC-LOGIN-004 | Caja blanca (cobertura de decisión role != "admin"): el administrador nunca se bloquea', async ({ page }) => {
    // UserService::login() -> if ($user && $user->role != "admin" && $user->failed_login_attempts >= 3)
    // Este caso fuerza la rama FALSE de "role != admin" (TC-LOGIN-003 cubre la rama TRUE).
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    for (let attempt = 1; attempt <= 3; attempt++) {
      await test.step(`Intento fallido de admin #${attempt}`, async () => {
        const response = await loginPage.loginAndCaptureResponse(SEED_USERS.admin.email, `Wrong#Admin${attempt}`);
        expect(response.status()).toBe(401);
        await expect(loginPage.loginError).toHaveText(INVALID_CREDENTIALS_MSG);
      });
    }

    await test.step('Intento #4 con contraseña correcta', async () => {
      const response = await loginPage.loginAndCaptureResponse(SEED_USERS.admin.email, SEED_USERS.admin.password);
      expect(response.status()).toBe(200);
      await expect(page).toHaveURL(/\/admin\/dashboard$/);
      await expect(page.locator('[data-test="nav-menu"]')).toContainText(SEED_USERS.admin.fullName);
    });
  });
});
