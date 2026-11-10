/**
 * Funcionalidad 3: Checkout - selección y validación del método de pago + creación de la orden.
 * Trazabilidad: docs/user-stories/v5.md -> "Checkout – Payment (Advanced)" AC1..AC9,
 *               "Checkout – Billing Address" AC3, "Checkout – Cart Review" AC1/AC5
 * Reglas reales (código):
 *   UI  -> sprint5/UI/src/app/checkout/payment/payment.component.ts (updateValidation, expirationDateValidator)
 *   API -> sprint5/API/app/Http/Controllers/PaymentController.php::check()
 */
import { expect, test } from '@playwright/test';
import { CheckoutPage } from './pages/checkout.page';
import { expiryFromCurrentMonth, SEED_USERS } from './support/test-data';

const PRODUCT = 'Combination Pliers';
const PAYMENT_OK = 'Payment was successful';

test.describe('F3 - Checkout y pago', () => {
  test.describe('TC-PAY-001 | Tabla de decisión: método de pago x validez de datos', () => {
    // Condiciones: C1 = método de pago, C2 = datos del método válidos (S/N/NA)
    // Acciones:    A1 = botón Confirm habilitado, A2 = API responde "Payment was successful"
    type Rule = {
      id: string; method: string; description: string; enabled: boolean;
      fill: (c: CheckoutPage) => Promise<void>; errorText?: string;
    };
    const rules: Rule[] = [
      { id: 'R1', method: 'bank-transfer', description: 'Transferencia con datos válidos', enabled: true,
        fill: async (c) => { await c.bankName.fill('Banco Popular'); await c.accountName.fill('Laura Gomez'); await c.accountNumber.fill('1234567890'); } },
      { id: 'R2', method: 'bank-transfer', description: 'Transferencia con nombre de banco con dígitos', enabled: false,
        fill: async (c) => { await c.bankName.fill('Banco 123'); await c.accountName.fill('Laura Gomez'); await c.accountNumber.fill('1234567890'); },
        errorText: 'Bank name can only contain letters and spaces.' },
      { id: 'R3', method: 'cash-on-delivery', description: 'Contra entrega (sin datos adicionales)', enabled: true,
        fill: async () => {} },
      { id: 'R4', method: 'buy-now-pay-later', description: 'BNPL sin seleccionar cuotas', enabled: false,
        fill: async () => {} },
      { id: 'R5', method: 'buy-now-pay-later', description: 'BNPL con 6 cuotas', enabled: true,
        fill: async (c) => { await c.monthlyInstallments.selectOption('6'); } },
      { id: 'R6', method: 'gift-card', description: 'Gift card 16 alfanum. + código 4 alfanum.', enabled: true,
        fill: async (c) => { await c.giftCardNumber.fill('ABCD1234EFGH5678'); await c.validationCode.fill('A1B2'); } },
      { id: 'R7', method: 'gift-card', description: 'Gift card con número de 15 caracteres', enabled: false,
        fill: async (c) => { await c.giftCardNumber.fill('ABCD1234EFGH567'); await c.validationCode.fill('A1B2'); } },
    ];

    for (const rule of rules) {
      test(`${rule.id} - ${rule.description}`, async ({ page }) => {
        const checkout = new CheckoutPage(page);
        await checkout.addProductToCart(PRODUCT);
        await checkout.goToPaymentStep(SEED_USERS.customer3.email, SEED_USERS.customer3.password, SEED_USERS.customer3.fullName);

        await checkout.paymentMethod.selectOption(rule.method);
        await rule.fill(checkout);
        await checkout.paymentMethod.focus(); // provoca blur del último campo para que se muestre la validación

        if (rule.enabled) {
          await expect(checkout.confirm).toBeEnabled();
          const responsePromise = page.waitForResponse((r) => r.url().includes('/payment/check'));
          await checkout.confirm.click();
          expect((await responsePromise).status()).toBe(200);
          await expect(checkout.paymentSuccess).toHaveText(PAYMENT_OK);
          await expect(checkout.paymentError).toHaveCount(0);
        } else {
          await expect(checkout.confirm).toBeDisabled();
          if (rule.errorText) await expect(checkout.fieldError(rule.errorText)).toBeVisible();
          await expect(checkout.paymentSuccess).toHaveCount(0);
        }
      });
    }

    test('R8 - Ningún método seleccionado', async ({ page }) => {
      const checkout = new CheckoutPage(page);
      await checkout.addProductToCart(PRODUCT);
      await checkout.goToPaymentStep(SEED_USERS.customer3.email, SEED_USERS.customer3.password, SEED_USERS.customer3.fullName);

      await expect(checkout.paymentMethod).toHaveValue('');
      await expect(checkout.confirm).toBeDisabled();
    });
  });

  test.describe('TC-PAY-002 | BVA fecha de vencimiento de tarjeta de crédito (paso = 1 mes)', () => {
    const cases = [
      { label: 'Mes anterior (límite-1) -> inválido', offset: -1, valid: false },
      { label: 'Mes actual (valor límite) -> válido', offset: 0, valid: true },
      { label: 'Mes siguiente (límite+1) -> válido', offset: 1, valid: true },
    ];

    for (const c of cases) {
      test(c.label, async ({ page }) => {
        const expiry = expiryFromCurrentMonth(c.offset);
        const checkout = new CheckoutPage(page);
        await checkout.addProductToCart(PRODUCT);
        await checkout.goToPaymentStep(SEED_USERS.customer3.email, SEED_USERS.customer3.password, SEED_USERS.customer3.fullName);

        await checkout.paymentMethod.selectOption('credit-card');
        await checkout.creditCardNumber.fill('4111-1111-1111-1111');
        await checkout.expirationDate.fill(expiry);
        await checkout.cvv.fill('123');
        await checkout.cardHolderName.fill('Laura Gomez');
        await checkout.paymentMethod.focus();

        if (!c.valid) {
          await expect(checkout.fieldError('Expiration date must be in the future.')).toBeVisible();
          await expect(checkout.confirm).toBeDisabled();
          return;
        }
        await expect(checkout.confirm).toBeEnabled();
        const responsePromise = page.waitForResponse((r) => r.url().includes('/payment/check'));
        await checkout.confirm.click();
        const response = await responsePromise;
        await expect(checkout.paymentSuccess.or(checkout.paymentError)).toBeVisible(); // resultado visible para la evidencia
        await test.info().attach('respuesta POST /payment/check', { body: `HTTP ${response.status()}\n${await response.text()}`, contentType: 'text/plain' });
        // Front-end y back-end deben coincidir en la frontera: mes actual = tarjeta vigente. -> ver BUG-003
        expect(response.status(), `BUG-003: la API debe aceptar la tarjeta con vencimiento ${expiry}`).toBe(200);
        await expect(checkout.paymentSuccess).toHaveText(PAYMENT_OK);
      });
    }
  });

  test('TC-PAY-003 | E2E: compra completa con tarjeta de crédito genera factura y vacía el carrito', async ({ page }) => {
    const checkout = new CheckoutPage(page);
    await checkout.addProductToCart(PRODUCT);
    await checkout.goToPaymentStep(SEED_USERS.customer2.email, SEED_USERS.customer2.password, SEED_USERS.customer2.fullName);

    await checkout.paymentMethod.selectOption('credit-card');
    await checkout.creditCardNumber.fill('4111-1111-1111-1111');
    await checkout.expirationDate.fill(expiryFromCurrentMonth(12));
    await checkout.cvv.fill('123');
    await checkout.cardHolderName.fill('Jack Howe');

    // 1er clic en Confirm: valida el pago (POST /payment/check)
    await checkout.confirm.click();
    await expect(checkout.paymentSuccess).toHaveText(PAYMENT_OK);

    // 2do clic en Confirm: crea la factura (POST /invoices). Ver observación OBS-01 en el informe.
    const invoiceResponse = page.waitForResponse((r) => r.url().endsWith('/invoices') && r.request().method() === 'POST');
    await checkout.confirm.click();
    const invoice = await (await invoiceResponse).json();
    expect(invoice.invoice_number).toMatch(/^INV-\d+$/);

    await expect(checkout.orderConfirmation).toHaveText(`Thanks for your order! Your invoice number is ${invoice.invoice_number}.`);
    await expect(checkout.cartQuantityBadge).toHaveCount(0); // carrito vacío

    // Postcondición: la factura aparece en "My invoices"
    await page.goto('/account/invoices');
    await expect(page.getByRole('cell', { name: invoice.invoice_number })).toBeVisible();
  });
});
