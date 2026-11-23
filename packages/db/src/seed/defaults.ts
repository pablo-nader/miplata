export interface DefaultCategory {
  nameKey: string;
  icon: string;
}

export interface DefaultExpenseGroup {
  nameKey: string;
  color: number;
  categories: DefaultCategory[];
}

export const DEFAULT_EXPENSE_GROUPS: DefaultExpenseGroup[] = [
  {
    nameKey: "defaults.group.housing",
    color: 1,
    categories: [
      { nameKey: "defaults.category.buildingFees", icon: "building" },
      { nameKey: "defaults.category.rent", icon: "key" },
      { nameKey: "defaults.category.maintenance", icon: "hammer" },
      { nameKey: "defaults.category.homeInsurance", icon: "shield" },
    ],
  },
  {
    nameKey: "defaults.group.utilities",
    color: 2,
    categories: [
      { nameKey: "defaults.category.electricity", icon: "zap" },
      { nameKey: "defaults.category.gas", icon: "flame" },
      { nameKey: "defaults.category.water", icon: "droplet" },
      { nameKey: "defaults.category.internet", icon: "wifi" },
      { nameKey: "defaults.category.mobilePhone", icon: "smartphone" },
      { nameKey: "defaults.category.subscriptions", icon: "tv" },
    ],
  },
  {
    nameKey: "defaults.group.taxes",
    color: 3,
    categories: [
      { nameKey: "defaults.category.propertyTax", icon: "landmark" },
      { nameKey: "defaults.category.municipalTax", icon: "building-2" },
      { nameKey: "defaults.category.vehicleTax", icon: "id-card" },
    ],
  },
  {
    nameKey: "defaults.group.food",
    color: 4,
    categories: [
      { nameKey: "defaults.category.groceries", icon: "shopping-cart" },
      { nameKey: "defaults.category.deliveryAndRestaurants", icon: "utensils" },
    ],
  },
  {
    nameKey: "defaults.group.transport",
    color: 5,
    categories: [
      { nameKey: "defaults.category.fuel", icon: "fuel" },
      { nameKey: "defaults.category.carInsurance", icon: "car" },
      { nameKey: "defaults.category.tollsAndParking", icon: "square-parking" },
      { nameKey: "defaults.category.carMaintenance", icon: "wrench" },
      { nameKey: "defaults.category.publicTransport", icon: "bus" },
    ],
  },
  {
    nameKey: "defaults.group.health",
    color: 1,
    categories: [
      { nameKey: "defaults.category.healthInsurance", icon: "heart-pulse" },
      { nameKey: "defaults.category.pharmacy", icon: "pill" },
      { nameKey: "defaults.category.medicalVisits", icon: "stethoscope" },
    ],
  },
  {
    nameKey: "defaults.group.personal",
    color: 2,
    categories: [
      { nameKey: "defaults.category.goingOut", icon: "party-popper" },
      { nameKey: "defaults.category.clothing", icon: "shirt" },
      { nameKey: "defaults.category.gym", icon: "dumbbell" },
      { nameKey: "defaults.category.education", icon: "graduation-cap" },
      { nameKey: "defaults.category.gifts", icon: "gift" },
      { nameKey: "defaults.category.pets", icon: "paw-print" },
      { nameKey: "defaults.category.travel", icon: "plane" },
    ],
  },
  {
    nameKey: "defaults.group.financialCharges",
    color: 3,
    categories: [
      { nameKey: "defaults.category.interest", icon: "percent" },
      { nameKey: "defaults.category.financialTaxes", icon: "receipt" },
      { nameKey: "defaults.category.fees", icon: "badge-dollar-sign" },
      { nameKey: "defaults.category.cardInsurance", icon: "shield-check" },
      { nameKey: "defaults.category.adjustment", icon: "scale" },
    ],
  },
  {
    nameKey: "defaults.group.other",
    color: 4,
    categories: [{ nameKey: "defaults.category.other", icon: "ellipsis" }],
  },
];

export const DEFAULT_INCOME_CATEGORIES: (DefaultCategory & { color: number })[] = [
  { nameKey: "defaults.income.salary", icon: "briefcase", color: 5 },
  { nameKey: "defaults.income.bonus", icon: "banknote", color: 1 },
  { nameKey: "defaults.income.freelance", icon: "laptop", color: 2 },
  { nameKey: "defaults.income.rental", icon: "key-round", color: 3 },
  { nameKey: "defaults.income.investments", icon: "trending-up", color: 4 },
  { nameKey: "defaults.income.refunds", icon: "undo-2", color: 5 },
  { nameKey: "defaults.income.other", icon: "ellipsis", color: 1 },
];

export const DEFAULT_CASH_ACCOUNT_NAME_KEY = "defaults.account.cash";

export const INSTITUTION_CATALOG: { kind: "bank" | "wallet"; name: string }[] = [
  { kind: "bank", name: "Banco Nación" },
  { kind: "bank", name: "Banco Provincia" },
  { kind: "bank", name: "Galicia" },
  { kind: "bank", name: "Santander" },
  { kind: "bank", name: "BBVA" },
  { kind: "bank", name: "Macro" },
  { kind: "bank", name: "Banco Ciudad" },
  { kind: "bank", name: "Credicoop" },
  { kind: "bank", name: "ICBC" },
  { kind: "bank", name: "Patagonia" },
  { kind: "bank", name: "Supervielle" },
  { kind: "bank", name: "Brubank" },
  { kind: "wallet", name: "Mercado Pago" },
  { kind: "wallet", name: "Ualá" },
  { kind: "wallet", name: "Naranja X" },
  { kind: "wallet", name: "Cuenta DNI" },
  { kind: "wallet", name: "Personal Pay" },
  { kind: "wallet", name: "Prex" },
  { kind: "wallet", name: "Lemon" },
];
