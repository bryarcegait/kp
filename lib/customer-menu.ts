export type CustomerMenuProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  imageSrc: string;
  isAvailable: boolean;
};

export type DefaultMenuProduct = Omit<CustomerMenuProduct, "imageSrc"> & {
  imageUrl: string;
  sortOrder: number;
};

const WING_FLAVORS =
  "Flavors: Buffalo, Soy Honey Garlic, Cheesy Wings, Creamy Garlic Mushroom, Garlic Parmesan, Caramelized Patis, Teriyaki, Sriracha Garlic, Salted Egg, Lemon-Pepper, Spicy Korean Barbecue.";

export const WING_FLAVOR_OPTIONS = [
  "Plain",
  "Buffalo",
  "Soy Honey Garlic",
  "Cheesy Wings",
  "Spicy Cheesy Wings",
  "Creamy Garlic Mushroom",
  "Garlic Parmesan",
  "Caramelized Patis",
  "Teriyaki",
  "Sriracha Garlic",
  "Salted Egg",
  "Lemon-Pepper",
  "Spicy Korean Barbecue",
] as const;

export const BEST_SELLER_WING_FLAVORS = [
  "Buffalo",
  "Soy Honey Garlic",
  "Cheesy Wings",
  "Creamy Garlic Mushroom",
] as const;

export const SPICY_WING_FLAVORS = [
  "Buffalo",
  "Spicy Cheesy Wings",
  "Sriracha Garlic",
  "Spicy Korean Barbecue",
] as const;

export const EXTRA_WING_FLAVOR_PRICE = 10;

export const WING_SIDE_OPTIONS = [
  "No side",
  "Java Rice",
  "Plain Rice",
  "Fries",
] as const;

export const FRIES_FLAVOR_OPTIONS = [
  "Plain",
  "Sour Cream",
  "Barbecue",
  "Cheese",
] as const;

export type WingFlavor = (typeof WING_FLAVOR_OPTIONS)[number];
export type WingSide = (typeof WING_SIDE_OPTIONS)[number];
export type FriesFlavor = (typeof FRIES_FLAVOR_OPTIONS)[number];

export type WingOrderChoice = {
  key: string;
  label: string;
  category: "Wings" | "Barkada Box" | "Bilao";
  noSideProductId: string;
  withSideProductId?: string;
  noSidePrice: number;
  withSidePrice?: number;
  includedFlavorCount: number;
  supportsSides: boolean;
};

export const WING_ORDER_CHOICES: WingOrderChoice[] = [
  {
    key: "3pcs",
    label: "3 pcs Wings",
    category: "Wings",
    noSideProductId: "wings-3pcs-solo",
    withSideProductId: "wings-3pcs-rice-fries",
    noSidePrice: 88,
    withSidePrice: 118,
    includedFlavorCount: 1,
    supportsSides: true,
  },
  {
    key: "4pcs",
    label: "4 pcs Wings",
    category: "Wings",
    noSideProductId: "wings-4pcs-solo",
    withSideProductId: "wings-4pcs-rice-fries",
    noSidePrice: 117,
    withSidePrice: 147,
    includedFlavorCount: 1,
    supportsSides: true,
  },
  {
    key: "6pcs",
    label: "6 pcs Wings",
    category: "Wings",
    noSideProductId: "wings-6pcs-solo",
    withSideProductId: "wings-6pcs-rice-fries",
    noSidePrice: 175,
    withSidePrice: 205,
    includedFlavorCount: 1,
    supportsSides: true,
  },
  {
    key: "8pcs",
    label: "8 pcs Wings",
    category: "Wings",
    noSideProductId: "wings-8pcs-solo",
    withSideProductId: "wings-8pcs-rice-fries",
    noSidePrice: 234,
    withSidePrice: 264,
    includedFlavorCount: 2,
    supportsSides: true,
  },
  {
    key: "boneless",
    label: "Boneless Wings",
    category: "Wings",
    noSideProductId: "boneless-wings-solo",
    withSideProductId: "boneless-wings-rice-fries",
    noSidePrice: 175,
    withSidePrice: 147,
    includedFlavorCount: 1,
    supportsSides: true,
  },
  {
    key: "12pcs",
    label: "12 pcs Barkada Box",
    category: "Barkada Box",
    noSideProductId: "barkada-12pcs",
    noSidePrice: 350,
    includedFlavorCount: 2,
    supportsSides: false,
  },
  {
    key: "24pcs",
    label: "24 pcs Barkada Box",
    category: "Barkada Box",
    noSideProductId: "barkada-24pcs",
    noSidePrice: 700,
    includedFlavorCount: 4,
    supportsSides: false,
  },
  {
    key: "30pcs",
    label: "30 pcs Barkada Box",
    category: "Barkada Box",
    noSideProductId: "barkada-30pcs",
    noSidePrice: 875,
    includedFlavorCount: 5,
    supportsSides: false,
  },
  {
    key: "60pcs",
    label: "60 pcs Wings Bilao",
    category: "Bilao",
    noSideProductId: "bilao-60pcs",
    noSidePrice: 1750,
    includedFlavorCount: 6,
    supportsSides: false,
  },
  {
    key: "90pcs",
    label: "90 pcs Wings Bilao",
    category: "Bilao",
    noSideProductId: "bilao-90pcs",
    noSidePrice: 2650,
    includedFlavorCount: 6,
    supportsSides: false,
  },
];

export function getWingOrderChoiceByProductId(productId: string) {
  return WING_ORDER_CHOICES.find(
    (choice) =>
      choice.noSideProductId === productId || choice.withSideProductId === productId
  );
}

export function getExtraWingFlavorCount(
  choice: WingOrderChoice,
  wingFlavors: readonly WingFlavor[]
) {
  const chargeableFlavorCount = new Set(
    wingFlavors.filter((flavor) => flavor !== "Plain")
  ).size;
  return Math.max(0, chargeableFlavorCount - choice.includedFlavorCount);
}

export function getWingExtraFlavorCharge(
  choice: WingOrderChoice,
  wingFlavors: readonly WingFlavor[]
) {
  return getExtraWingFlavorCount(choice, wingFlavors) * EXTRA_WING_FLAVOR_PRICE;
}

export function isBestSellerWingFlavor(flavor: WingFlavor) {
  return (BEST_SELLER_WING_FLAVORS as readonly string[]).includes(flavor);
}

export function isSpicyWingFlavor(flavor: WingFlavor) {
  return (SPICY_WING_FLAVORS as readonly string[]).includes(flavor);
}

export const CUSTOMER_MENU_CATEGORIES = [
  "Wings",
  "Barkada Box",
  "Bilao",
  "Extras",
  "Silog",
  "Pasta",
  "Sisig",
  "Coffee",
  "Soda Mix",
  "Non-Coffee",
  "Juice Pitcher",
  "Bottled",
] as const;

export const CATEGORY_IMAGE_FALLBACKS: Record<string, string> = {
  Wings: "/menu/wings.svg",
  "Barkada Box": "/menu/wings.svg",
  Bilao: "/menu/wings.svg",
  Extras: "/menu/extras.svg",
  Silog: "/menu/silog.svg",
  Pasta: "/menu/pasta.svg",
  Sisig: "/menu/sisig.svg",
  Coffee: "/menu/drinks.svg",
  "Soda Mix": "/menu/drinks.svg",
  "Non-Coffee": "/menu/drinks.svg",
  "Juice Pitcher": "/menu/drinks.svg",
  Bottled: "/menu/drinks.svg",
};

function product(
  id: string,
  category: string,
  name: string,
  price: number,
  description: string,
  sortOrder: number,
  imageUrl = CATEGORY_IMAGE_FALLBACKS[category] ?? "/menu/extras.svg"
): DefaultMenuProduct {
  return {
    id,
    category,
    name,
    price,
    description,
    imageUrl,
    isAvailable: true,
    sortOrder,
  };
}

export const DEFAULT_MENU_PRODUCTS: DefaultMenuProduct[] = [
  product("wings-3pcs-solo", "Wings", "3 pcs Wings Solo", 88, WING_FLAVORS, 10),
  product("wings-3pcs-rice-fries", "Wings", "3 pcs Wings with Rice or Fries", 118, WING_FLAVORS, 20),
  product("wings-4pcs-solo", "Wings", "4 pcs Wings Solo", 117, WING_FLAVORS, 30),
  product("wings-4pcs-rice-fries", "Wings", "4 pcs Wings with Rice or Fries", 147, WING_FLAVORS, 40),
  product("wings-6pcs-solo", "Wings", "6 pcs Wings Solo", 175, WING_FLAVORS, 50),
  product("wings-6pcs-rice-fries", "Wings", "6 pcs Wings with Rice or Fries", 205, WING_FLAVORS, 60),
  product("wings-8pcs-solo", "Wings", "8 pcs Wings Solo", 234, WING_FLAVORS, 70),
  product("wings-8pcs-rice-fries", "Wings", "8 pcs Wings with Rice or Fries", 264, WING_FLAVORS, 80),
  product("boneless-wings-solo", "Wings", "Boneless Wings Solo", 175, WING_FLAVORS, 90),
  product("boneless-wings-rice-fries", "Wings", "Boneless Wings with Rice or Fries", 147, WING_FLAVORS, 100),
  product("barkada-12pcs", "Barkada Box", "12 pcs Barkada Box", 350, "Good for sharing. Choose up to 2 flavors.", 110),
  product("barkada-24pcs", "Barkada Box", "24 pcs Barkada Box", 700, "Good for sharing. Choose up to 4 flavors.", 120),
  product("barkada-30pcs", "Barkada Box", "30 pcs Barkada Box", 875, "Good for sharing. Choose up to 5 flavors.", 130),
  product("bilao-60pcs", "Bilao", "60 pcs Wings Bilao", 1750, "Party-size wings. Choose up to 5 flavors.", 140),
  product("bilao-90pcs", "Bilao", "90 pcs Wings Bilao", 2650, "Party-size wings. Choose up to 5 flavors.", 150),
  product("fries", "Extras", "Fries", 80, "Available flavors: cheese, sour cream, or BBQ.", 160),
  product("nachos", "Extras", "Nachos", 130, "Loaded nachos for sharing.", 170),
  product("java-rice", "Extras", "Java Rice", 35, "Extra serving of java rice.", 180),
  product("plain-rice", "Extras", "Plain Rice", 25, "Extra serving of plain rice.", 190),
  product("fried-egg", "Extras", "Fried Egg", 30, "Extra fried egg.", 200),
  product("garlic-mayo-dip", "Extras", "Garlic Mayo Dip", 25, "Extra garlic mayo dip.", 210),
  product("cheesy-dip", "Extras", "Cheesy Dip", 30, "Extra cheesy dip.", 220),
  product("tapsilog", "Silog", "Tapsilog", 130, "Beef tapa, garlic rice, and egg.", 230),
  product("tocilog", "Silog", "Tocilog", 140, "Sweet tocino with garlic rice and egg.", 240),
  product("porksilog", "Silog", "Porksilog", 140, "Savory pork, garlic rice, and egg.", 250),
  product("chicksilog", "Silog", "Chicksilog", 150, "Crispy chicken with garlic rice and egg.", 260),
  product("bangsilog", "Silog", "Bangsilog", 130, "Bangus, garlic rice, and egg.", 270),
  product("bacsilog", "Silog", "Bacsilog", 130, "Bacon-style strips, garlic rice, and egg.", 280),
  product("hungsilog", "Silog", "Hungsilog", 130, "Hungarian sausage, garlic rice, and egg.", 290),
  product("carbonara-solo", "Pasta", "Carbonara Solo", 135, "Creamy carbonara solo serving.", 300),
  product("carbonara-2pcs-wings", "Pasta", "Carbonara with 2 pcs Wings", 195, "Creamy carbonara served with 2 pcs wings.", 310),
  product("carbonara-4pcs-wings", "Pasta", "Carbonara with 4 pcs Wings", 250, "Creamy carbonara served with 4 pcs wings.", 320),
  product("sisig-java-rice", "Sisig", "Sisig with Java Rice", 135, "Sisig served with java rice.", 330),
  product("sisig-ala-carte", "Sisig", "Sisig A La Carte", 180, "Sisig without rice.", 340),
  product("latte", "Coffee", "Latte", 95, "Available hot or iced.", 350),
  product("americano", "Coffee", "Americano", 95, "Available hot or iced.", 360),
  product("cappuccino", "Coffee", "Cappuccino", 95, "Available hot or iced.", 370),
  product("mocha", "Coffee", "Mocha", 125, "Available hot or iced.", 380),
  product("white-chocolate-mocha", "Coffee", "White Chocolate Mocha", 125, "Available hot or iced.", 390),
  product("caramel-macchiato", "Coffee", "Caramel Macchiato", 125, "Available hot or iced.", 400),
  product("spanish-latte", "Coffee", "Spanish Latte", 115, "Available hot or iced.", 410),
  product("french-vanilla-latte", "Coffee", "French Vanilla Latte", 115, "Available hot or iced.", 420),
  product("vanilla-latte", "Coffee", "Vanilla Latte", 115, "Available hot or iced.", 430),
  product("salted-caramel-latte", "Coffee", "Salted Caramel Latte", 115, "Available hot or iced.", 440),
  product("hazelnut-latte", "Coffee", "Hazelnut Latte", 115, "Available hot or iced.", 450),
  product("lychee-soda", "Soda Mix", "Lychee", 85, "Refreshing soda mix.", 460),
  product("blue-lemonade-soda", "Soda Mix", "Blue Lemonade", 85, "Refreshing soda mix.", 470),
  product("four-seasons-soda", "Soda Mix", "Four Seasons", 85, "Refreshing soda mix.", 480),
  product("strawberry-soda", "Soda Mix", "Strawberry", 85, "Refreshing soda mix.", 490),
  product("blueberry-soda", "Soda Mix", "Blueberry", 85, "Refreshing soda mix.", 500),
  product("green-apple-soda", "Soda Mix", "Green Apple", 85, "Refreshing soda mix.", 510),
  product("matcha-latte", "Non-Coffee", "Matcha Latte", 125, "Creamy non-coffee latte.", 520),
  product("choco-latte", "Non-Coffee", "Choco Latte", 115, "Creamy non-coffee latte.", 530),
  product("strawberry-latte", "Non-Coffee", "Strawberry Latte", 115, "Creamy non-coffee latte.", 540),
  product("blueberry-latte", "Non-Coffee", "Blueberry Latte", 115, "Creamy non-coffee latte.", 550),
  product("cucumber-pitcher", "Juice Pitcher", "Cucumber Pitcher 1.8L", 100, "1.8L juice pitcher.", 560),
  product("lemon-iced-tea-pitcher", "Juice Pitcher", "Lemon Iced Tea Pitcher 1.8L", 100, "1.8L juice pitcher.", 570),
  product("blue-lemonade-pitcher", "Juice Pitcher", "Blue Lemonade Pitcher 1.8L", 100, "1.8L juice pitcher.", 580),
  product("soda-1-5l", "Bottled", "1.5L Soda", 90, "Bottled soda.", 590),
  product("mismo", "Bottled", "Mismo", 30, "Bottled drink.", 600),
  product("mountain-dew", "Bottled", "Mountain Dew", 30, "Bottled drink.", 610),
];

export function getCategoryImageFallback(category: string) {
  return CATEGORY_IMAGE_FALLBACKS[category] ?? "/menu/extras.svg";
}
