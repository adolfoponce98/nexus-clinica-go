export const PAYMENT_PROVIDERS = [
  { id: 'stripe', name: 'Stripe', color: '#635bff', recurring: true, implemented: true },
  { id: 'oxxo', name: 'OXXO', color: '#cf202f', recurring: false, implemented: false },
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    color: '#009ee3',
    recurring: true,
    implemented: false,
  },
  { id: 'openpay', name: 'Openpay', color: '#008db8', recurring: true, implemented: false },
  { id: 'stp', name: 'STP', color: '#6f2d91', recurring: false, implemented: false },
  { id: 'spei', name: 'SPEI', color: '#147854', recurring: false, implemented: false },
  { id: 'clip', name: 'Clip', color: '#fc6824', recurring: true, implemented: false },
  { id: 'conekta', name: 'Conekta', color: '#171142', recurring: true, implemented: false },
];
export const PRICE_PERIODS = [
  { id: 'monthly', name: 'Mensual', months: 1 },
  { id: 'quarterly', name: 'Trimestral', months: 3 },
  { id: 'semiannual', name: 'Semestral', months: 6 },
  { id: 'annual', name: 'Anual', months: 12 },
  { id: 'once', name: 'Pago único', months: 0 },
];
export function emptyProviderBinding() {
  return {
    enabled: false,
    amountCents: 0,
    productId: '',
    priceId: '',
    planId: '',
    reference: '',
    processor: '',
  };
}
export function emptyPrice(period: string) {
  return {
    period,
    active: true,
    currency: 'MXN',
    providers: Object.fromEntries(
      PAYMENT_PROVIDERS.map((p) => [
        p.id,
        { test: emptyProviderBinding(), live: emptyProviderBinding() },
      ]),
    ),
  };
}
