import { expect, Locator, Page } from '@playwright/test';

export interface RegisterData {
  firstName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD
  country: string; // código ISO (value del <select>)
  postalCode: string;
  houseNumber: string;
  phone: string;
  email: string;
  password: string;
}

/** Page Object de /auth/register. */
export class RegisterPage {
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly dob: Locator;
  readonly country: Locator;
  readonly postalCode: Locator;
  readonly houseNumber: Locator;
  readonly street: Locator;
  readonly city: Locator;
  readonly state: Locator;
  readonly phone: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly registerError: Locator;
  readonly passwordError: Locator;
  readonly minLengthRequirement: Locator;

  constructor(private readonly page: Page) {
    this.firstName = page.locator('[data-test="first-name"]');
    this.lastName = page.locator('[data-test="last-name"]');
    this.dob = page.locator('[data-test="dob"]');
    this.country = page.locator('[data-test="country"]');
    this.postalCode = page.locator('[data-test="postal_code"]');
    this.houseNumber = page.locator('[data-test="house_number"]');
    this.street = page.locator('[data-test="street"]');
    this.city = page.locator('[data-test="city"]');
    this.state = page.locator('[data-test="state"]');
    this.phone = page.locator('[data-test="phone"]');
    this.email = page.locator('[data-test="email"]');
    this.password = page.locator('[data-test="password"]');
    this.submit = page.locator('[data-test="register-submit"]');
    this.registerError = page.locator('[data-test="register-error"]');
    this.passwordError = page.locator('[data-test="password-error"]');
    // Ítem de la lista de requisitos de contraseña que corresponde a la longitud mínima.
    this.minLengthRequirement = page.locator('#passwordHelp li', { hasText: 'Be at least 8 characters long' });
  }

  async goto() {
    await this.page.goto('/auth/register');
  }

  async fillForm(data: RegisterData) {
    await this.firstName.fill(data.firstName);
    await this.lastName.fill(data.lastName);
    await this.dob.fill(data.dob);
    await this.country.selectOption(data.country);
    await this.postalCode.fill(data.postalCode);
    await this.houseNumber.fill(data.houseNumber);
    // La app autocompleta calle/ciudad/estado a partir de país + código postal + número.
    await expect(this.state).not.toHaveValue('');
    await this.phone.fill(data.phone);
    await this.email.fill(data.email);
    await this.password.fill(data.password);
  }

  /** Envía el formulario de registro. */
  async submitForm() {
    await this.submit.click();
  }
}
