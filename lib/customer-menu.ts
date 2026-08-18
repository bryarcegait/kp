export type CustomerMenuItem = {
  id: string;
  name: string;
  price: number;
  category: CustomerMenuCategory;
  description: string;
  imageSrc: string;
};

export const CUSTOMER_MENU_CATEGORIES = [
  "Silog",
  "Wings",
  "Pasta",
  "Sisig",
] as const;

export type CustomerMenuCategory = (typeof CUSTOMER_MENU_CATEGORIES)[number];

export const CUSTOMER_MENU_ITEMS: CustomerMenuItem[] = [
  {
    id: "tapsilog",
    name: "Tapsilog",
    price: 130,
    category: "Silog",
    description: "Beef tapa, garlic rice, and egg.",
    imageSrc: "/menu/silog.svg",
  },
  {
    id: "tocilog",
    name: "Tocilog",
    price: 140,
    category: "Silog",
    description: "Sweet tocino with garlic rice and egg.",
    imageSrc: "/menu/silog.svg",
  },
  {
    id: "porksilog",
    name: "Porksilog",
    price: 140,
    category: "Silog",
    description: "Savory pork, garlic rice, and egg.",
    imageSrc: "/menu/silog.svg",
  },
  {
    id: "chicksilog",
    name: "Chicksilog",
    price: 150,
    category: "Silog",
    description: "Crispy chicken with garlic rice and egg.",
    imageSrc: "/menu/silog.svg",
  },
  {
    id: "bangsilog",
    name: "Bangsilog",
    price: 130,
    category: "Silog",
    description: "Bangus, garlic rice, and egg.",
    imageSrc: "/menu/silog.svg",
  },
  {
    id: "bacsilog",
    name: "Bacsilog",
    price: 130,
    category: "Silog",
    description: "Bacon-style strips, garlic rice, and egg.",
    imageSrc: "/menu/silog.svg",
  },
  {
    id: "hungsilog",
    name: "Hungsilog",
    price: 130,
    category: "Silog",
    description: "Hungarian sausage, garlic rice, and egg.",
    imageSrc: "/menu/silog.svg",
  },
  {
    id: "classic-buffalo-wings",
    name: "Classic Buffalo Wings",
    price: 189,
    category: "Wings",
    description: "Chicken wings tossed in tangy buffalo sauce.",
    imageSrc: "/menu/wings.svg",
  },
  {
    id: "garlic-parmesan-wings",
    name: "Garlic Parmesan Wings",
    price: 199,
    category: "Wings",
    description: "Creamy garlic parmesan wings with a crisp finish.",
    imageSrc: "/menu/wings.svg",
  },
  {
    id: "honey-soy-wings",
    name: "Honey Soy Wings",
    price: 199,
    category: "Wings",
    description: "Sweet soy glaze over juicy chicken wings.",
    imageSrc: "/menu/wings.svg",
  },
  {
    id: "creamy-chicken-alfredo",
    name: "Creamy Chicken Alfredo",
    price: 165,
    category: "Pasta",
    description: "Creamy white sauce pasta with chicken slices.",
    imageSrc: "/menu/pasta.svg",
  },
  {
    id: "filipino-spaghetti",
    name: "Filipino Spaghetti",
    price: 145,
    category: "Pasta",
    description: "Sweet-style spaghetti with savory meat sauce.",
    imageSrc: "/menu/pasta.svg",
  },
  {
    id: "pork-sisig",
    name: "Pork Sisig",
    price: 180,
    category: "Sisig",
    description: "Sizzling pork sisig with onions and chili.",
    imageSrc: "/menu/sisig.svg",
  },
  {
    id: "chicken-sisig",
    name: "Chicken Sisig",
    price: 170,
    category: "Sisig",
    description: "Chicken sisig with creamy, spicy seasoning.",
    imageSrc: "/menu/sisig.svg",
  },
];

export const SILOG_MEALS = CUSTOMER_MENU_ITEMS.filter(
  (item) => item.category === "Silog"
);

export function getMenuItem(id: string) {
  return CUSTOMER_MENU_ITEMS.find((item) => item.id === id);
}
