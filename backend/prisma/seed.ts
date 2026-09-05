import { PrismaClient, Prisma, Product } from "@prisma/client";

const prisma = new PrismaClient();

// Prices are stored in paise (INR smallest unit). ₹1 = 100 paise.
const rupees = (amount: number) => amount * 100;

type SeedProduct = {
  name: string;
  category: string;
  brand: string;
  price: number; // rupees, converted below
  description: string;
  attributes: Record<string, unknown>;
  quantity: number;
  imageUrl?: string;
};

const products: SeedProduct[] = [
  // ---------------- Laptops ----------------
  {
    name: "AeroBook 14 Slim",
    category: "laptops",
    brand: "AeroTech",
    price: 54999,
    description:
      "A lightweight 14-inch laptop built for students and everyday productivity, with all-day battery life.",
    attributes: {
      ram: "8GB",
      storage: "512GB SSD",
      cpu: "Intel Core i5-1235U",
      gpu: "Intel Iris Xe (integrated)",
      screenSize: "14 inch",
      batteryLifeHours: 12,
      weightKg: 1.3,
      useCase: ["programming", "everyday", "student"],
    },
    quantity: 18,
  },
  {
    name: "CodeForge R5",
    category: "laptops",
    brand: "Vulcan",
    price: 68999,
    description:
      "A balanced developer laptop with a dedicated GPU for light gaming and ML experimentation, plus a comfortable keyboard for long coding sessions.",
    attributes: {
      ram: "16GB",
      storage: "512GB SSD",
      cpu: "AMD Ryzen 5 7640HS",
      gpu: "NVIDIA RTX 3050 (6GB)",
      screenSize: "15.6 inch",
      batteryLifeHours: 7,
      weightKg: 1.8,
      useCase: ["programming", "gaming", "student"],
    },
    quantity: 9,
  },
  {
    name: "CodeForge R5 Pro",
    category: "laptops",
    brand: "Vulcan",
    price: 82999,
    description:
      "The higher-RAM variant of the CodeForge R5, aimed at users running local LLMs, containers, or heavier IDEs alongside a browser with many tabs.",
    attributes: {
      ram: "32GB",
      storage: "1TB SSD",
      cpu: "AMD Ryzen 7 7840HS",
      gpu: "NVIDIA RTX 4050 (6GB)",
      screenSize: "15.6 inch",
      batteryLifeHours: 6.5,
      weightKg: 1.9,
      useCase: ["programming", "gaming", "ml"],
    },
    quantity: 5,
  },
  {
    name: "Sable Air 13",
    category: "laptops",
    brand: "Sable",
    price: 74999,
    description:
      "A premium ultraportable with an OLED display, aimed at design and productivity work rather than gaming.",
    attributes: {
      ram: "16GB",
      storage: "512GB SSD",
      cpu: "Intel Core i7-1355U",
      gpu: "Intel Iris Xe (integrated)",
      screenSize: "13.3 inch OLED",
      batteryLifeHours: 14,
      weightKg: 1.1,
      useCase: ["design", "everyday", "student"],
    },
    quantity: 11,
  },
  {
    name: "TitanBook Gaming 16",
    category: "laptops",
    brand: "Titan",
    price: 129999,
    description:
      "A dedicated gaming laptop with a high-refresh display, well beyond typical student budgets but useful for enthusiasts.",
    attributes: {
      ram: "32GB",
      storage: "1TB SSD",
      cpu: "Intel Core i9-13900H",
      gpu: "NVIDIA RTX 4070 (8GB)",
      screenSize: "16 inch, 165Hz",
      batteryLifeHours: 4,
      weightKg: 2.4,
      useCase: ["gaming"],
    },
    quantity: 4,
  },
  {
    name: "BudgetLine 15",
    category: "laptops",
    brand: "AeroTech",
    price: 34999,
    description:
      "An entry-level laptop for browsing, office work, and light coding. Not recommended for gaming or heavy multitasking.",
    attributes: {
      ram: "8GB",
      storage: "256GB SSD",
      cpu: "Intel Core i3-1215U",
      gpu: "Intel UHD (integrated)",
      screenSize: "15.6 inch",
      batteryLifeHours: 9,
      weightKg: 1.7,
      useCase: ["everyday", "student"],
    },
    quantity: 22,
  },
  {
    name: "CodeForge R3",
    category: "laptops",
    brand: "Vulcan",
    price: 47999,
    description:
      "A more affordable Vulcan option with a discrete-adjacent Iris Xe iGPU — fine for programming, only casual gaming.",
    attributes: {
      ram: "16GB",
      storage: "512GB SSD",
      cpu: "Intel Core i5-1335U",
      gpu: "Intel Iris Xe (integrated)",
      screenSize: "15.6 inch",
      batteryLifeHours: 10,
      weightKg: 1.6,
      useCase: ["programming", "student"],
    },
    quantity: 0, // intentionally out of stock for eval/demo scenarios
  },

  // ---------------- Smartphones ----------------
  {
    name: "Nova X3",
    category: "smartphones",
    brand: "Nova",
    price: 24999,
    description: "A mid-range smartphone with a large battery and a solid 108MP camera.",
    attributes: {
      ram: "8GB",
      storage: "128GB",
      display: "6.5 inch AMOLED, 120Hz",
      battery: "5000mAh",
      camera: "108MP main",
      useCase: ["everyday", "photography"],
    },
    quantity: 30,
  },
  {
    name: "Nova X3 Pro",
    category: "smartphones",
    brand: "Nova",
    price: 34999,
    description: "The Pro variant with more RAM, faster charging, and a telephoto lens.",
    attributes: {
      ram: "12GB",
      storage: "256GB",
      display: "6.7 inch AMOLED, 120Hz",
      battery: "5000mAh, 67W charging",
      camera: "108MP main + telephoto",
      useCase: ["everyday", "photography"],
    },
    quantity: 16,
  },
  {
    name: "Pulse Lite",
    category: "smartphones",
    brand: "Pulse",
    price: 12999,
    description: "A budget smartphone covering the essentials: calls, messaging, and light apps.",
    attributes: {
      ram: "4GB",
      storage: "64GB",
      display: "6.5 inch LCD, 60Hz",
      battery: "5000mAh",
      camera: "50MP main",
      useCase: ["everyday"],
    },
    quantity: 40,
  },
  {
    name: "Zenith Fold",
    category: "smartphones",
    brand: "Zenith",
    price: 149999,
    description: "A premium foldable flagship for users who want a tablet-like screen on the go.",
    attributes: {
      ram: "16GB",
      storage: "512GB",
      display: "7.6 inch foldable AMOLED",
      battery: "4400mAh",
      camera: "50MP triple system",
      useCase: ["productivity", "photography"],
    },
    quantity: 3,
  },

  // ---------------- Headphones ----------------
  {
    name: "SilentWave ANC 200",
    category: "headphones",
    brand: "SilentWave",
    price: 6999,
    description: "Over-ear noise-cancelling headphones tuned for commuting and calls.",
    attributes: { type: "over-ear", anc: true, batteryLifeHours: 30, wireless: true },
    quantity: 25,
  },
  {
    name: "SilentWave ANC 200 Studio",
    category: "headphones",
    brand: "SilentWave",
    price: 11999,
    description: "A studio-tuned variant of the ANC 200 with a flatter frequency response for mixing and editing.",
    attributes: { type: "over-ear", anc: true, batteryLifeHours: 28, wireless: true, useCase: ["studio", "editing"] },
    quantity: 8,
  },
  {
    name: "PodBuds Air",
    category: "headphones",
    brand: "PodBuds",
    price: 3499,
    description: "Compact true-wireless earbuds for everyday use, with a compact charging case.",
    attributes: { type: "in-ear", anc: false, batteryLifeHours: 6, wireless: true },
    quantity: 50,
  },
  {
    name: "PodBuds Air Pro",
    category: "headphones",
    brand: "PodBuds",
    price: 5999,
    description: "Adds active noise cancellation and wireless charging to the base PodBuds Air.",
    attributes: { type: "in-ear", anc: true, batteryLifeHours: 7, wireless: true },
    quantity: 33,
  },
  {
    name: "BassCraft Wired 100",
    category: "headphones",
    brand: "BassCraft",
    price: 1299,
    description: "An affordable wired headset with a boom mic, popular for gaming on a budget.",
    attributes: { type: "over-ear", anc: false, wireless: false, mic: true, useCase: ["gaming"] },
    quantity: 60,
  },

  // ---------------- Monitors ----------------
  {
    name: "ClearView 24 FHD",
    category: "monitors",
    brand: "ClearView",
    price: 8999,
    description: "A reliable 24-inch 1080p monitor for office and study use.",
    attributes: { size: "24 inch", resolution: "1920x1080", refreshRateHz: 75, panel: "IPS" },
    quantity: 20,
  },
  {
    name: "ClearView 27 QHD",
    category: "monitors",
    brand: "ClearView",
    price: 16999,
    description: "A sharper 27-inch QHD monitor suited to coding, design, and multitasking.",
    attributes: { size: "27 inch", resolution: "2560x1440", refreshRateHz: 100, panel: "IPS" },
    quantity: 14,
  },
  {
    name: "Velocity 27 Gaming 165Hz",
    category: "monitors",
    brand: "Velocity",
    price: 22999,
    description: "A high refresh rate gaming monitor with QHD resolution.",
    attributes: { size: "27 inch", resolution: "2560x1440", refreshRateHz: 165, panel: "IPS", useCase: ["gaming"] },
    quantity: 7,
  },
  {
    name: "ClearView 22 FHD Budget",
    category: "monitors",
    brand: "ClearView",
    price: 6499,
    description: "An entry-level 22-inch monitor for basic office work.",
    attributes: { size: "22 inch", resolution: "1920x1080", refreshRateHz: 60, panel: "VA" },
    quantity: 26,
  },

  // ---------------- Keyboards ----------------
  {
    name: "TypeCraft Mechanical 87",
    category: "keyboards",
    brand: "TypeCraft",
    price: 3499,
    description: "A tenkeyless mechanical keyboard with hot-swappable switches, popular with programmers.",
    attributes: { layout: "TKL", switchType: "hot-swappable, red linear", backlight: "RGB", wireless: false },
    quantity: 21,
  },
  {
    name: "TypeCraft Mechanical 87 Wireless",
    category: "keyboards",
    brand: "TypeCraft",
    price: 4999,
    description: "The wireless version of the Mechanical 87, with Bluetooth and 2.4GHz modes.",
    attributes: { layout: "TKL", switchType: "hot-swappable, red linear", backlight: "RGB", wireless: true },
    quantity: 12,
  },
  {
    name: "OfficeType Slim",
    category: "keyboards",
    brand: "OfficeType",
    price: 1499,
    description: "A quiet, low-profile membrane keyboard for office environments.",
    attributes: { layout: "full-size", switchType: "membrane", backlight: "none", wireless: false },
    quantity: 35,
  },

  // ---------------- Mice ----------------
  {
    name: "GrabPoint Wireless",
    category: "mice",
    brand: "GrabPoint",
    price: 999,
    description: "A comfortable everyday wireless mouse with a long battery life.",
    attributes: { dpi: 1600, wireless: true, buttons: 5 },
    quantity: 45,
  },
  {
    name: "GrabPoint Pro Gaming",
    category: "mice",
    brand: "GrabPoint",
    price: 2999,
    description: "A lightweight gaming mouse with a high-precision sensor and programmable buttons.",
    attributes: { dpi: 16000, wireless: true, buttons: 7, useCase: ["gaming"] },
    quantity: 19,
  },
  {
    name: "OfficeType Compact Mouse",
    category: "mice",
    brand: "OfficeType",
    price: 599,
    description: "A compact, no-frills wired mouse.",
    attributes: { dpi: 1200, wireless: false, buttons: 3 },
    quantity: 50,
  },

  // ---------------- Accessories ----------------
  {
    name: "GuardCase Laptop Sleeve 15\"",
    category: "accessories",
    brand: "GuardCase",
    price: 1499,
    description: "A padded neoprene sleeve that fits most 15-inch laptops.",
    attributes: { compatibleSizeInches: 15, material: "neoprene" },
    quantity: 60,
  },
  {
    name: "GuardCase Laptop Sleeve 14\"",
    category: "accessories",
    brand: "GuardCase",
    price: 1299,
    description: "A padded neoprene sleeve that fits most 13–14-inch laptops.",
    attributes: { compatibleSizeInches: 14, material: "neoprene" },
    quantity: 55,
  },
  {
    name: "PowerHub 65W USB-C Charger",
    category: "accessories",
    brand: "PowerHub",
    price: 1799,
    description: "A compact 65W GaN charger that can power most modern laptops and phones.",
    attributes: { wattage: 65, ports: "1x USB-C, 1x USB-A" },
    quantity: 40,
  },
  {
    name: "DeskRiser Laptop Stand",
    category: "accessories",
    brand: "DeskRiser",
    price: 1999,
    description: "An adjustable aluminum laptop stand that improves posture and cooling.",
    attributes: { material: "aluminum", adjustable: true },
    quantity: 30,
  },
  {
    name: "HubLink 7-in-1 USB-C Dock",
    category: "accessories",
    brand: "HubLink",
    price: 2499,
    description: "A USB-C hub with HDMI, USB-A ports, SD card reader, and power passthrough.",
    attributes: { ports: "HDMI, 3x USB-A, SD, microSD, USB-C PD" },
    quantity: 24,
  },
  {
    name: "ClearView Anti-Glare Screen Protector 27\"",
    category: "accessories",
    brand: "ClearView",
    price: 899,
    description: "A matte anti-glare film compatible with most 27-inch monitors.",
    attributes: { compatibleSizeInches: 27 },
    quantity: 45,
  },
  {
    name: "WristEase Ergonomic Wrist Rest",
    category: "accessories",
    brand: "WristEase",
    price: 699,
    description: "A memory-foam wrist rest for keyboard and mouse use.",
    attributes: { material: "memory foam" },
    quantity: 70,
  },
];

async function main() {
  console.log("Seeding database...");

  // Clean slate for idempotent re-seeding in a demo environment.
  await prisma.auditLog.deleteMany();
  await prisma.agentMessage.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.agentSession.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const createdProducts: Product[] = [];
  for (const p of products) {
    const product = await prisma.product.create({
      data: {
        name: p.name,
        category: p.category,
        brand: p.brand,
        price: rupees(p.price),
        description: p.description,
        attributes: p.attributes as Prisma.InputJsonValue,
        imageUrl: p.imageUrl ?? null,
        inventory: { create: { quantity: p.quantity } },
      },
    });
    createdProducts.push(product);
  }

  console.log(`Created ${createdProducts.length} products.`);

  // A handful of merchant-approved offers, tied to real products.
  const findByName = (name: string) => createdProducts.find((p) => p.name === name)!;

  const offers = [
    {
      product: findByName("GuardCase Laptop Sleeve 15\""),
      description: "10% off when bought alongside a 15-inch laptop",
      discountPct: 10,
    },
    {
      product: findByName("PodBuds Air Pro"),
      description: "Festive offer: flat ₹500 off",
      discountFlat: rupees(500),
    },
    {
      product: findByName("ClearView 27 QHD"),
      description: "Back-to-college offer: 8% off",
      discountPct: 8,
    },
  ];

  for (const o of offers) {
    await prisma.offer.create({
      data: {
        productId: o.product.id,
        description: o.description,
        discountPct: o.discountPct ?? null,
        discountFlat: o.discountFlat ?? null,
        validUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days out
      },
    });
  }

  console.log(`Created ${offers.length} offers.`);

  // A couple of demo users for testing order history / merchant views.
  const demoUsers = await Promise.all([
    prisma.user.create({ data: { name: "Aditi Rao", email: "aditi.demo@agentcart.test" } }),
    prisma.user.create({ data: { name: "Rohan Mehta", email: "rohan.demo@agentcart.test" } }),
  ]);

  console.log(`Created ${demoUsers.length} demo users.`);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
