import { Locator, Page } from '@playwright/test';

/** Page Object de /auth/login. Los locators usan los atributos data-test que expone la app. */
export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly loginError: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;

  constructor(private readonly page: Page) {
    this.email = page.locator('[data-test="email"]');
    this.password = page.locator('[data-test="password"]');
    this.submit = page.locator('[data-test="login-submit"]');
    this.loginError = page.locator('[data-test="login-error"]');
    this.emailError = page.locator('[data-test="email-error"]');
    this.passwordError = page.locator('[data-test="password-error"]');
  }

  async goto() {
    await this.page.goto('/auth/login');
  }

  async login(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }

  /** Envía el login y devuelve la respuesta HTTP de POST /users/login (para validar el código de estado). */
  async loginAndCaptureResponse(email: string, password: string) {
    const responsePromise = this.page.waitForResponse(
      (r) => r.url().includes('/users/login') && r.request().method() === 'POST',
    );
    await this.login(email, password);
    return responsePromise;
  }
}
