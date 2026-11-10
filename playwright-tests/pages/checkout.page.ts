import { expect, Locator, Page } from '@playwright/test';

/** Page Object del flujo de compra: catálogo -> carrito -> sign in -> dirección -> pago. */
export class CheckoutPage {
  readonly cartNavLink: Locator;
  readonly cartQuantityBadge: Locator;
  readonly proceedFromCart: Locator;
  readonly proceedFromSignIn: Locator;
  readonly proceedFromAddress: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly loginSubmit: Locator;
  readonly country: Locator;
  readonly postalCode: Locator;
  readonly houseNumber: Locator;
  readonly street: Locator;
  readonly state: Locator;
  // Paso de pago
  readonly paymentMethod: Locator;
  readonly bankName: Locator;
  readonly accountName: Locator;
  readonly accountNumber: Locator;
  readonly giftCardNumber: Locator;
  readonly validationCode: Locator;
  readonly creditCardNumber: Locator;
  readonly expirationDate: Locator;
  readonly cvv: Locator;
  readonly cardHolderName: Locator;
  readonly monthlyInstallments: Locator;
  readonly confirm: Locator;
  readonly paymentSuccess: Locator;
  readonly paymentError: Locator;
  readonly orderConfirmation: Locator;

  constructor(private readonly page: Page) {
    this.cartNavLink = page.locator('[data-test="nav-cart"]');
    this.cartQuantityBadge = page.locator('[data-test="cart-quantity"]');
    this.proceedFromCart = page.locator('[data-test="proceed-1"]');
    this.proceedFromSignIn = page.locator('[data-test="proceed-2"]');
    this.proceedFromAddress = page.locator('[data-test="proceed-3"]');
    this.email = page.locator('[data-test="email"]');
    this.password = page.locator('[data-test="password"]');
    this.loginSubmit = page.locator('[data-test="login-submit"]');
    this.country = page.locator('[data-test="country"]');
    this.postalCode = page.locator('[data-test="postal_code"]');
    this.houseNumber = page.locator('[data-test="house_number"]');
    this.street = page.locator('[data-test="street"]');
    this.state = page.locator('[data-test="state"]');
    this.paymentMethod = page.locator('[data-test="payment-method"]');
    this.bankName = page.locator('[data-test="bank_name"]');
    this.accountName = page.locator('[data-test="account_name"]');
    this.accountNumber = page.locator('[data-test="account_number"]');
    this.giftCardNumber = page.locator('[data-test="gift_card_number"]');
    this.validationCode = page.locator('[data-test="validation_code"]');
    this.creditCardNumber = page.locator('[data-test="credit_card_number"]');
    this.expirationDate = page.locator('[data-test="expiration_date"]');
    this.cvv = page.locator('[data-test="cvv"]');
    this.cardHolderName = page.locator('[data-test="card_holder_name"]');
    this.monthlyInstallments = page.locator('[data-test="monthly_installments"]');
    this.confirm = page.locator('[data-test="finish"]');
    this.paymentSuccess = page.locator('[data-test="payment-success-message"]');
    this.paymentError = page.locator('[data-test="payment-error-message"]');
    this.orderConfirmation = page.locator('#order-confirmation');
  }

  /** Agrega al carrito el producto indicado desde el catálogo (cantidad por defecto = 1). */
  async addProductToCart(productName: string) {
    await this.page.goto('/');
    await this.page.locator('[data-test="product-name"]', { hasText: productName }).first().click();
    await expect(this.page).toHaveURL(/\/product\//);
    await this.page.locator('[data-test="add-to-cart"]').click();
    await expect(this.page.getByRole('alert').filter({ hasText: 'Product added to shopping cart.' })).toBeVisible();
    await expect(this.cartQuantityBadge).toHaveText('1');
  }

  /** Lleva el carrito hasta el paso de pago iniciando sesión dentro del checkout. */
  async goToPaymentStep(email: string, password: string, fullName: string) {
    await this.cartNavLink.click();
    await expect(this.page).toHaveURL(/\/checkout/);
    await this.proceedFromCart.click();
    // Paso 2: Sign in
    await this.email.fill(email);
    await this.password.fill(password);
    await this.loginSubmit.click();
    await expect(this.page.getByText(`Hello ${fullName}, you are already logged in.`)).toBeVisible();
    await this.proceedFromSignIn.click();
    // Paso 3: Billing address. Primero se espera a que termine la precarga asíncrona de la
    // dirección de la cuenta (si no, sobrescribe lo que escribe el test).
    await expect(this.street, 'precarga de la dirección del usuario autenticado').not.toHaveValue('');
    // Colombia no tiene patrón de código postal restringido en la app.
    await this.country.selectOption('CO');
    await this.postalCode.fill('760001');
    await this.houseNumber.fill('12');
    await expect(this.state, 'la búsqueda de código postal autocompleta el estado').not.toHaveValue('');
    await expect(this.country).toHaveValue('CO');
    await expect(this.postalCode).toHaveValue('760001');
    await expect(this.proceedFromAddress).toBeEnabled();
    await this.proceedFromAddress.click();
    await expect(this.paymentMethod).toBeVisible();
  }

  /** Mensaje de validación (en rojo) que la UI muestra debajo de un campo de pago. */
  fieldError(text: string) {
    return this.page.locator('.alert-danger', { hasText: text });
  }
}
