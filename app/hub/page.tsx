"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

/* =========================================================
   TYPES
========================================================= */

type Category = {
  name: string;
  imageUrl?: string;
  icon?: string;
};

type ProductItem = {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  offerPrice?: number;
  stock?: number;
  tag: string[];
};

type CartItem = {
  product: ProductItem;
  quantity: number;
};

/* =========================================================
   DEFAULT CATEGORIES
========================================================= */

const defaultCategories: Category[] = [
  { name: "Grocery", icon: "🛒" },
  { name: "Bakery", icon: "🥐" },
  { name: "Meat", icon: "🥩" },
  { name: "Food", icon: "🍔" },
  { name: "Pharmacy", icon: "💊" },
  { name: "Laundry", icon: "👕" },
  { name: "Salon", icon: "💇" },
  { name: "Turf", icon: "🏏" },
  { name: "Services", icon: "🔧" },
  { name: "Taxi", icon: "🚕" },
  { name: "Cakes", icon: "🎂" },
  { name: "Fruits", icon: "🍎" },
  { name: "Vegetables", icon: "🥦" },
  { name: "Fish", icon: "🐟" },
  { name: "Chicken", icon: "🍗" },
  { name: "Beverages", icon: "🥤" },
  { name: "Snacks", icon: "🍿" },
  { name: "Ice Cream", icon: "🍦" },
  { name: "Sweets", icon: "🍬" },
];

/* =========================================================
   STATIC ADS
========================================================= */

const ads = [
  {
    title: "Everything you need.",
    subtitle: "Delivered fast with FASTever.",
    button: "Explore FASTever",
  },
  {
    title: "Food. Shopping. Services.",
    subtitle: "One app for your local needs.",
    button: "Start Exploring",
  },
];

/* =========================================================
   POPULAR SERVICES
========================================================= */

const popular = [
  {
    title: "Food Delivery",
    description: "Order delicious food from local restaurants.",
    icon: "🍔",
  },
  {
    title: "InstaHub",
    description: "Shop groceries and products from nearby stores.",
    icon: "🛒",
  },
  {
    title: "Home Services",
    description: "Plumber, electrician, AC repair and more.",
    icon: "🔧",
  },
  {
    title: "Taxi Booking",
    description: "Book taxis and local vehicles easily.",
    icon: "🚕",
  },
  {
    title: "Pharmacy",
    description: "Find medicines and pharmacy services nearby.",
    icon: "💊",
  },
  {
    title: "Laundry",
    description: "Easy pickup and delivery for your laundry.",
    icon: "👕",
  },
];

/* =========================================================
   MORE SERVICES
========================================================= */

const moreServices = [
  "🍰 Cake Shops",
  "❄️ AC Repair",
  "⚡ Electrician",
  "🧹 Cleaning",
  "🧪 Lab at Home",
  "🏪 Local Stores",
  "🛻 Pickup",
  "🚌 Tourist Bus",
  "🚿 Car Wash",
  "🏠 Home Services",
  "💇 Salon",
  "🏏 Turf Booking",
];

/* =========================================================
   CATEGORY ICONS
========================================================= */

const categoryIcons: Record<string, string> = {
  grocery: "🛒",
  groceries: "🛒",
  bakery: "🥐",
  meat: "🥩",
  food: "🍔",
  pharmacy: "💊",
  laundry: "👕",
  salon: "💇",
  turf: "🏏",
  services: "🔧",
  service: "🔧",
  taxi: "🚕",
  cake: "🎂",
  cakes: "🎂",
  "cake shops": "🎂",
  fruits: "🍎",
  vegetables: "🥦",
  fish: "🐟",
  seafood: "🐟",
  chicken: "🍗",
  beverages: "🥤",
  drinks: "🥤",
  snacks: "🍿",
  icecream: "🍦",
  "ice cream": "🍦",
  sweets: "🍬",
};

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getCategoryIcon(name: string) {
  const key = normalizeText(name);

  return (
    categoryIcons[key] ||
    categoryIcons[key.replace(/\s+/g, "")] ||
    "🛍️"
  );
}

/* =========================================================
   HUB PAGE
========================================================= */

export default function HubPage() {
  /* =======================================================
     LOCATION
  ======================================================= */

  const [locationStatus, setLocationStatus] = useState<
    "checking" | "available" | "denied" | "unavailable"
  >("checking");

  /* =======================================================
     PRODUCTS
  ======================================================= */

  const [categories, setCategories] =
    useState<Category[]>(defaultCategories);

  const [allProducts, setAllProducts] = useState<ProductItem[]>([]);

  const [selectedCategory, setSelectedCategory] =
    useState<string | null>(null);

  const [loadingProducts, setLoadingProducts] = useState(true);

  const [firebaseError, setFirebaseError] = useState(false);

  /* =======================================================
     ADS
  ======================================================= */

  const [currentAd, setCurrentAd] = useState(0);

  /* =======================================================
     CART
  ======================================================= */

  const [cart, setCart] = useState<CartItem[]>([]);

  const [showCart, setShowCart] = useState(false);

  const [cartLoaded, setCartLoaded] = useState(false);

  /* =========================================================
     LOAD CART FROM LOCAL STORAGE
  ========================================================= */

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(
        "fastever_cart"
      );

      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);

        if (Array.isArray(parsedCart)) {
          setCart(parsedCart);
        }
      }
    } catch (error) {
      console.error(
        "FASTever: Unable to load cart:",
        error
      );
    } finally {
      setCartLoaded(true);
    }
  }, []);

  /* =========================================================
     SAVE CART TO LOCAL STORAGE
  ========================================================= */

  useEffect(() => {
    if (!cartLoaded) return;

    try {
      localStorage.setItem(
        "fastever_cart",
        JSON.stringify(cart)
      );
    } catch (error) {
      console.error(
        "FASTever: Unable to save cart:",
        error
      );
    }
  }, [cart, cartLoaded]);

  /* =========================================================
     LOCATION
  ========================================================= */

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationStatus("available");
      },
      () => {
        setLocationStatus("denied");
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000,
      }
    );
  }, []);

  /* =========================================================
     LOAD FIREBASE PRODUCTS
  ========================================================= */

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        setFirebaseError(false);

        console.log(
          "FASTever: Loading home_categories..."
        );

        const snapshot = await getDocs(
          collection(db, "home_categories")
        );

        console.log(
          "FASTever: home_categories documents:",
          snapshot.size
        );

        const categoryMap = new Map<string, Category>();

        const productsList: ProductItem[] = [];

        /* ---------------------------------------------------
           DEFAULT CATEGORIES
        --------------------------------------------------- */

        defaultCategories.forEach((category) => {
          const key = normalizeText(category.name);

          categoryMap.set(key, {
            ...category,
          });
        });

        /* ---------------------------------------------------
           FIREBASE PRODUCTS
        --------------------------------------------------- */

        snapshot.forEach((doc) => {
          const data = doc.data();

          console.log(
            "FASTever Firebase item:",
            doc.id,
            data
          );

          /* -----------------------------------------------
             TAG
          ----------------------------------------------- */

          const rawTags = data.tag;

          let tags: string[] = [];

          if (Array.isArray(rawTags)) {
            tags = rawTags
              .filter(
                (tag) =>
                  tag !== null &&
                  tag !== undefined
              )
              .map((tag) => String(tag).trim())
              .filter(
                (tag) => tag.length > 0
              );
          } else if (
            typeof rawTags === "string" &&
            rawTags.trim().length > 0
          ) {
            tags = [rawTags.trim()];
          }

          /* -----------------------------------------------
             PRODUCT
          ----------------------------------------------- */

          const product: ProductItem = {
            id: doc.id,

            name:
              typeof data.name === "string"
                ? data.name
                : "Unnamed Product",

            imageUrl:
              typeof data.imageUrl === "string"
                ? data.imageUrl
                : "",

            price:
              typeof data.price === "number"
                ? data.price
                : Number(data.price) || 0,

            offerPrice:
              data.offerPrice !== undefined &&
              data.offerPrice !== null
                ? Number(data.offerPrice)
                : undefined,

            stock:
              data.stock !== undefined &&
              data.stock !== null
                ? Number(data.stock)
                : undefined,

            tag: tags,
          };

          productsList.push(product);

          /* -----------------------------------------------
             CONNECT TAG → CATEGORY
          ----------------------------------------------- */

          tags.forEach((tag) => {
            const categoryKey =
              normalizeText(tag);

            const existingCategory =
              categoryMap.get(categoryKey);

            if (existingCategory) {
              if (
                !existingCategory.imageUrl &&
                product.imageUrl
              ) {
                categoryMap.set(
                  categoryKey,
                  {
                    ...existingCategory,
                    imageUrl:
                      product.imageUrl,
                  },
                );
              }
            } else {
              categoryMap.set(
                categoryKey,
                {
                  name: tag,
                  imageUrl:
                    product.imageUrl ||
                    undefined,
                  icon: getCategoryIcon(tag),
                },
              );
            }
          });
        });

        /* ---------------------------------------------------
           SAVE
        --------------------------------------------------- */

        setAllProducts(productsList);

        setCategories(
          Array.from(categoryMap.values())
        );

        console.log(
          "FASTever: Total products loaded:",
          productsList.length
        );

        console.log(
          "FASTever: Products:",
          productsList
        );
      } catch (error) {
        console.error(
          "FASTever Firebase error:",
          error
        );

        setFirebaseError(true);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  /* =========================================================
     ADVERTISEMENT SLIDER
  ========================================================= */

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentAd(
        (previous) =>
          (previous + 1) % ads.length
      );
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  /* =========================================================
     REQUEST LOCATION
  ========================================================= */

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return;
    }

    setLocationStatus("checking");

    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationStatus("available");
      },
      () => {
        setLocationStatus("denied");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  /* =========================================================
     CATEGORY CLICK
  ========================================================= */

  const handleCategoryClick = (
    categoryName: string
  ) => {
    const cleanName = categoryName.trim();

    console.log(
      "FASTever: Category clicked:",
      cleanName
    );

    if (
      selectedCategory &&
      normalizeText(selectedCategory) ===
        normalizeText(cleanName)
    ) {
      setSelectedCategory(null);
      return;
    }

    setSelectedCategory(cleanName);
  };

  /* =========================================================
     FILTER PRODUCTS
  ========================================================= */

  const filteredProducts = selectedCategory
    ? allProducts.filter((product) => {
        const selected =
          normalizeText(selectedCategory);

        return product.tag.some(
          (tag) =>
            normalizeText(tag) === selected
        );
      })
    : [];

  /* =========================================================
     PRODUCT PRICE
  ========================================================= */

  const getProductPrice = (
    product: ProductItem
  ) => {
    if (
      product.offerPrice !== undefined &&
      product.offerPrice < product.price
    ) {
      return product.offerPrice;
    }

    return product.price;
  };

  /* =========================================================
     ADD TO CART
  ========================================================= */

  const addToCart = (product: ProductItem) => {
    if (
      product.stock !== undefined &&
      product.stock <= 0
    ) {
      return;
    }

    setCart((previousCart) => {
      const existingItem =
        previousCart.find(
          (item) =>
            item.product.id === product.id
        );

      if (existingItem) {
        const currentQuantity =
          existingItem.quantity;

        const maxStock =
          product.stock !== undefined
            ? product.stock
            : Infinity;

        if (
          currentQuantity >= maxStock
        ) {
          return previousCart;
        }

        return previousCart.map(
          (item) =>
            item.product.id ===
              product.id
              ? {
                  ...item,
                  quantity:
                    item.quantity + 1,
                }
              : item
        );
      }

      return [
        ...previousCart,
        {
          product,
          quantity: 1,
        },
      ];
    });
  };

  /* =========================================================
     INCREASE QUANTITY
  ========================================================= */

  const increaseQuantity = (
    productId: string
  ) => {
    setCart((previousCart) =>
      previousCart.map((item) => {
        if (
          item.product.id !== productId
        ) {
          return item;
        }

        const maxStock =
          item.product.stock !== undefined
            ? item.product.stock
            : Infinity;

        if (
          item.quantity >= maxStock
        ) {
          return item;
        }

        return {
          ...item,
          quantity:
            item.quantity + 1,
        };
      })
    );
  };

  /* =========================================================
     DECREASE QUANTITY
  ========================================================= */

  const decreaseQuantity = (
    productId: string
  ) => {
    setCart((previousCart) =>
      previousCart
        .map((item) => {
          if (
            item.product.id !== productId
          ) {
            return item;
          }

          return {
            ...item,
            quantity:
              item.quantity - 1,
          };
        })
        .filter(
          (item) => item.quantity > 0
        )
    );
  };

  /* =========================================================
     REMOVE FROM CART
  ========================================================= */

  const removeFromCart = (
    productId: string
  ) => {
    setCart((previousCart) =>
      previousCart.filter(
        (item) =>
          item.product.id !== productId
      )
    );
  };

  /* =========================================================
     CART TOTALS
  ========================================================= */

  const cartItemCount = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + item.quantity,
      0
    );
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total +
        getProductPrice(
          item.product
        ) *
          item.quantity,
      0
    );
  }, [cart]);

  /*
   * For now delivery is zero.
   * We can calculate the actual FASTever
   * delivery charge later.
   */
  const deliveryFee = 0;

  const cartTotal =
    cartSubtotal + deliveryFee;

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="min-h-screen bg-[#f7f7f7] text-[#111] antialiased">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-50 border-b border-[#e5b300] bg-[#FFC700] shadow-md">

        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">

          <Link
            href="/"
            className="shrink-0 transition hover:scale-105 active:scale-95"
          >
            <img
              src="/logo.png"
              alt="FASTever Logo"
              className="h-10 w-auto object-contain drop-shadow sm:h-12"
            />
          </Link>

          <div className="relative flex-1">

            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-black/60">
              🔍
            </span>

            <input
              type="text"
              placeholder="Search food, grocery, bakery, services..."
              className="h-12 w-full rounded-2xl border border-black/15 bg-white/95 pl-11 pr-4 text-sm text-black placeholder-black/50 shadow-inner outline-none transition focus:border-black focus:bg-white focus:ring-1 focus:ring-black sm:text-base"
            />

          </div>

          {/* LOCATION */}

          <button
            type="button"
            onClick={requestLocation}
            className={`hidden items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold shadow-sm transition active:scale-95 sm:flex ${
              locationStatus === "available"
                ? "border-emerald-700 bg-emerald-600 text-white"
                : "border-black/20 bg-black/10 text-black hover:bg-black hover:text-[#FFC700]"
            }`}
          >
            <span>📍</span>

            <span>
              {locationStatus ===
              "available"
                ? "Location On"
                : locationStatus ===
                  "checking"
                ? "Checking..."
                : "Set Location"}
            </span>
          </button>

          <button
            type="button"
            onClick={requestLocation}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-base shadow-sm transition active:scale-95 sm:hidden ${
              locationStatus === "available"
                ? "border-emerald-700 bg-emerald-600 text-white"
                : "border-black/20 bg-black/10 text-black hover:bg-black hover:text-[#FFC700]"
            }`}
            aria-label="Set Location"
          >
            📍
          </button>

        </div>

      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* LOCATION WARNING */}

        {locationStatus === "denied" && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">

            <div>

              <p className="text-sm font-bold text-orange-950">
                Location is turned off
              </p>

              <p className="text-xs text-orange-800/80">
                Turn on location to view
                restaurants, shops, and
                services nearest to you.
              </p>

            </div>

            <button
              type="button"
              onClick={requestLocation}
              className="shrink-0 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-orange-700 active:scale-95"
            >
              Enable
            </button>

          </div>
        )}

        {/* FIREBASE ERROR */}

        {firebaseError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">

            <p className="text-sm font-black text-red-800">
              Unable to load FASTever
              products.
            </p>

            <p className="mt-1 text-xs text-red-700">
              Check your Firebase
              configuration and Firestore
              permissions.
            </p>

          </div>
        )}

        {/* =====================================================
            CATEGORIES
        ===================================================== */}

        <section>

          <div className="mb-4 flex items-center justify-between">

            <div>

              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                What do you need?
              </h1>

              <p className="mt-1 text-sm text-black/50">
                Explore everything available
                on FASTever
              </p>

            </div>

            {selectedCategory && (
              <button
                type="button"
                onClick={() =>
                  setSelectedCategory(null)
                }
                className="text-xs font-bold text-red-600 hover:underline"
              >
                Clear filter ✕
              </button>
            )}

          </div>

          {loadingProducts && (
            <div className="mb-4 rounded-xl bg-white px-4 py-3 text-xs font-bold text-black/50 shadow-sm">
              Loading FASTever products...
            </div>
          )}

          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">

            {categories.map(
              (category) => {

                const isSelected =
                  selectedCategory &&
                  normalizeText(
                    selectedCategory
                  ) ===
                    normalizeText(
                      category.name
                    );

                return (
                  <button
                    key={category.name}
                    type="button"
                    onClick={() =>
                      handleCategoryClick(
                        category.name
                      )
                    }
                    className="group flex min-w-[82px] flex-col items-center focus:outline-none"
                  >

                    <div
                      className={`flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border shadow-sm transition-all duration-300 group-hover:-translate-y-1 ${
                        isSelected
                          ? "scale-105 border-4 border-black bg-[#FFC700] shadow-lg"
                          : "border-black/10 bg-white group-hover:border-[#FFC700] group-hover:shadow-md"
                      }`}
                    >

                      {category.imageUrl ? (
                        <img
                          src={
                            category.imageUrl
                          }
                          alt={
                            category.name
                          }
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                        />
                      ) : (
                        <span className="text-3xl">
                          {category.icon ||
                            getCategoryIcon(
                              category.name
                            )}
                        </span>
                      )}

                    </div>

                    <span
                      className={`mt-2 max-w-[82px] truncate text-xs font-bold transition-colors ${
                        isSelected
                          ? "font-black text-black underline"
                          : "text-black/80 group-hover:text-[#b88c00]"
                      }`}
                    >
                      {category.name}
                    </span>

                  </button>
                );
              }
            )}

          </div>

        </section>

        {/* =====================================================
            SELECTED CATEGORY PRODUCTS
        ===================================================== */}

        {selectedCategory && (
          <section className="mt-6 rounded-3xl border border-[#FFC700]/50 bg-white p-6 shadow-md">

            <div className="mb-5 flex items-center justify-between">

              <div>

                <h2 className="text-xl font-black capitalize text-black">
                  {selectedCategory} Items
                </h2>

                <p className="mt-1 text-xs font-semibold text-black/40">
                  {filteredProducts.length}{" "}
                  item
                  {filteredProducts.length ===
                  1
                    ? ""
                    : "s"}{" "}
                  available
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedCategory(null)
                }
                className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-black/60 hover:bg-black/10"
              >
                Close ✕
              </button>

            </div>

            {loadingProducts ? (
              <div className="py-12 text-center">

                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-black/10 border-t-black" />

                <p className="text-sm font-semibold text-black/50">
                  Loading items...
                </p>

              </div>
            ) : filteredProducts.length ===
              0 ? (

              <div className="rounded-2xl bg-[#fafafa] py-10 text-center">

                <div className="text-5xl">
                  🛍️
                </div>

                <p className="mt-3 text-sm font-black text-black/70">
                  No items available
                </p>

                <p className="mx-auto mt-1 max-w-md text-xs font-semibold leading-5 text-black/40">
                  There are currently no
                  Firebase products tagged
                  as{" "}
                  <span className="font-black text-black">
                    {selectedCategory}
                  </span>
                  .
                </p>

              </div>

            ) : (

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">

                {filteredProducts.map(
                  (product) => {

                    const hasOffer =
                      product.offerPrice !==
                        undefined &&
                      product.offerPrice <
                        product.price;

                    const displayPrice =
                      hasOffer
                        ? product.offerPrice!
                        : product.price;

                    const cartItem =
                      cart.find(
                        (item) =>
                          item.product.id ===
                          product.id
                      );

                    const quantity =
                      cartItem?.quantity || 0;

                    const isOutOfStock =
                      product.stock !==
                        undefined &&
                      product.stock <= 0;

                    const reachedStock =
                      product.stock !==
                        undefined &&
                      quantity >=
                        product.stock;

                    return (
                      <div
                        key={product.id}
                        className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-[#fafafa] p-3 shadow-sm transition hover:-translate-y-1 hover:border-[#FFC700] hover:shadow-lg"
                      >

                        {/* PRODUCT IMAGE */}

                        <div className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-xl bg-white">

                          {product.imageUrl ? (
                            <img
                              src={
                                product.imageUrl
                              }
                              alt={
                                product.name
                              }
                              className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <span className="text-4xl">
                              🛍️
                            </span>
                          )}

                          {hasOffer && (
                            <span className="absolute left-2 top-2 rounded-lg bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
                              SAVE ₹
                              {product.price -
                                product.offerPrice!}
                            </span>
                          )}

                        </div>

                        {/* PRODUCT DETAILS */}

                        <div className="mt-3 flex flex-1 flex-col justify-between">

                          <div>

                            <h3 className="line-clamp-2 text-sm font-black capitalize text-black">
                              {product.name}
                            </h3>

                            {product.stock !==
                              undefined && (
                              <p
                                className={`mt-1 text-[10px] font-bold ${
                                  product.stock >
                                  0
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                }`}
                              >
                                {product.stock >
                                0
                                  ? `In Stock: ${product.stock}`
                                  : "Out of stock"}
                              </p>
                            )}

                          </div>

                          {/* PRICE + CART */}

                          <div className="mt-3">

                            <div className="flex items-center gap-1.5">

                              <span className="text-base font-black text-black">
                                ₹
                                {
                                  displayPrice
                                }
                              </span>

                              {hasOffer && (
                                <span className="text-xs text-black/40 line-through">
                                  ₹
                                  {
                                    product.price
                                  }
                                </span>
                              )}

                            </div>

                            {/* ADD / QUANTITY */}

                            <div className="mt-2">

                              {isOutOfStock ? (

                                <button
                                  type="button"
                                  disabled
                                  className="w-full cursor-not-allowed rounded-xl bg-black/10 py-2 text-xs font-black text-black/30"
                                >
                                  OUT OF STOCK
                                </button>

                              ) : quantity ===
                                0 ? (

                                <button
                                  type="button"
                                  onClick={() =>
                                    addToCart(
                                      product
                                    )
                                  }
                                  className="w-full rounded-xl bg-[#FFC700] py-2 text-xs font-black text-black transition hover:bg-black hover:text-[#FFC700] active:scale-95"
                                >
                                  ADD +
                                </button>

                              ) : (

                                <div className="flex items-center justify-between rounded-xl bg-[#FFC700] p-1">

                                  <button
                                    type="button"
                                    onClick={() =>
                                      decreaseQuantity(
                                        product.id
                                      )
                                    }
                                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-lg font-black text-[#FFC700] transition active:scale-90"
                                  >
                                    −
                                  </button>

                                  <span className="text-sm font-black">
                                    {quantity}
                                  </span>

                                  <button
                                    type="button"
                                    disabled={
                                      reachedStock
                                    }
                                    onClick={() =>
                                      increaseQuantity(
                                        product.id
                                      )
                                    }
                                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg font-black transition active:scale-90 ${
                                      reachedStock
                                        ? "cursor-not-allowed bg-black/20 text-black/30"
                                        : "bg-black text-[#FFC700]"
                                    }`}
                                  >
                                    +
                                  </button>

                                </div>

                              )}

                            </div>

                          </div>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </section>
        )}

        {/* =====================================================
            ADVERTISEMENT
        ===================================================== */}

        <section className="mt-8">

          <div className="relative h-[210px] overflow-hidden rounded-3xl bg-gradient-to-r from-[#FFC700] via-[#F5B700] to-[#FFC700] shadow-xl sm:h-[250px]">

            {ads.map(
              (ad, index) => (

                <div
                  key={ad.title}
                  className={`absolute inset-0 flex items-center transition-all duration-700 ease-in-out ${
                    index === currentAd
                      ? "translate-x-0 opacity-100"
                      : index < currentAd
                      ? "-translate-x-full opacity-0"
                      : "translate-x-full opacity-0"
                  }`}
                >

                  <div className="px-6 sm:px-12">

                    <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-black/70">
                      FASTever
                    </p>

                    <h2 className="max-w-xl text-2xl font-black text-black sm:text-4xl lg:text-5xl">
                      {ad.title}
                    </h2>

                    <p className="mt-2 text-xs font-medium text-black/80 sm:text-base">
                      {ad.subtitle}
                    </p>

                    <button
                      type="button"
                      className="mt-4 rounded-xl bg-black px-5 py-2.5 text-xs font-black text-[#FFC700] shadow-lg transition hover:scale-105 hover:bg-black/85 active:scale-95 sm:mt-5 sm:py-3 sm:text-sm"
                    >
                      {ad.button} →
                    </button>

                  </div>

                </div>
              )
            )}

            <div className="absolute bottom-5 right-6 flex items-center gap-2">

              {ads.map(
                (_, index) => (

                  <button
                    key={index}
                    type="button"
                    onClick={() =>
                      setCurrentAd(
                        index
                      )
                    }
                    className={`h-2 rounded-full transition-all duration-300 ${
                      currentAd === index
                        ? "w-8 bg-black"
                        : "w-2 bg-black/30"
                    }`}
                    aria-label={`Slide ${
                      index + 1
                    }`}
                  />

                )
              )}

            </div>

          </div>

        </section>

        {/* =====================================================
            POPULAR SERVICES
        ===================================================== */}

        <section className="mt-10">

          <div className="mb-5">

            <h2 className="text-2xl font-black sm:text-3xl">
              Explore FASTever
            </h2>

            <p className="mt-1 text-sm text-black/50">
              Local services, shopping and
              delivery — all in one place.
            </p>

          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {popular.map(
              (item) => (

                <button
                  key={item.title}
                  type="button"
                  className="group flex items-center gap-5 rounded-3xl border border-black/5 bg-white p-5 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#FFC700] hover:shadow-xl"
                >

                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#f5f5f5] text-3xl transition group-hover:bg-[#FFF9E6]">
                    {item.icon}
                  </div>

                  <div>

                    <h3 className="font-black text-black/90 transition-colors group-hover:text-[#b88c00]">
                      {item.title}
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-black/50">
                      {item.description}
                    </p>

                  </div>

                  <span className="ml-auto text-xl text-black/30 transition group-hover:translate-x-1 group-hover:text-[#b88c00]">
                    →
                  </span>

                </button>

              )
            )}

          </div>

        </section>

        {/* =====================================================
            MORE SERVICES
        ===================================================== */}

        <section className="mt-12 rounded-3xl bg-white p-6 shadow-sm sm:p-8">

          <div className="mb-6">

            <h2 className="text-2xl font-black">
              More from FASTever
            </h2>

            <p className="mt-1 text-sm text-black/50">
              Everything you may need around
              your city.
            </p>

          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">

            {moreServices.map(
              (service) => (

                <button
                  key={service}
                  type="button"
                  className="rounded-2xl border border-black/5 bg-[#fafafa] px-3 py-4 text-center text-sm font-bold transition hover:border-[#FFC700] hover:bg-[#FFF9E6] hover:text-black active:scale-95"
                >
                  {service}
                </button>

              )
            )}

          </div>

        </section>

      </div>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="mt-16 border-t border-[#e5b300] bg-gradient-to-b from-[#FFC700] to-[#F5B700] text-black">

        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

            <div>

              <Link
                href="/"
                className="inline-block transition hover:opacity-90"
              >
                <img
                  src="/logo.png"
                  alt="FASTever Logo"
                  className="h-12 w-auto object-contain drop-shadow sm:h-14"
                />
              </Link>

              <p className="mt-4 max-w-xs text-sm font-semibold leading-6 text-black/80">
                Your local super-app for food,
                shopping, bookings, deliveries
                and everyday services.
              </p>

            </div>

            <div>

              <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-black">
                Services
              </h3>

              <div className="space-y-3 text-sm font-bold text-black/75">
                <p>Food Delivery</p>
                <p>InstaHub Shopping</p>
                <p>Home Services</p>
                <p>Taxi Booking</p>
                <p>Pharmacy</p>
                <p>Laundry</p>
              </div>

            </div>

            <div>

              <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-black">
                Company
              </h3>

              <div className="space-y-3 text-sm font-bold text-black/75">

                <Link
                  href="/about"
                  className="block transition hover:text-black"
                >
                  About FASTever
                </Link>

                <Link
                  href="/contact"
                  className="block transition hover:text-black"
                >
                  Contact Us
                </Link>

                <Link
                  href="/careers"
                  className="block transition hover:text-black"
                >
                  Careers
                </Link>

                <Link
                  href="/partner"
                  className="block transition hover:text-black"
                >
                  Become a Partner
                </Link>

              </div>

            </div>

            <div>

              <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-black">
                Legal & Support
              </h3>

              <div className="space-y-3 text-sm font-bold text-black/75">

                <Link
                  href="/privacy"
                  className="block transition hover:text-black"
                >
                  Privacy Policy
                </Link>

                <Link
                  href="/terms"
                  className="block transition hover:text-black"
                >
                  Terms & Conditions
                </Link>

                <Link
                  href="/refund"
                  className="block transition hover:text-black"
                >
                  Refund Policy
                </Link>

                <Link
                  href="/help"
                  className="block transition hover:text-black"
                >
                  Help & Support
                </Link>

              </div>

            </div>

          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-black/15 pt-6 text-xs font-bold text-black/75 sm:flex-row sm:items-center sm:justify-between">

            <p>
              © {new Date().getFullYear()} FASTever.
              All rights reserved.
            </p>

            <div className="flex gap-6">

              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-black"
              >
                Instagram
              </a>

              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-black"
              >
                Facebook
              </a>

              <a
                href="https://wa.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-black"
              >
                WhatsApp
              </a>

            </div>

          </div>

        </div>

      </footer>

      {/* =====================================================
          FLOATING WHATSAPP
      ===================================================== */}

      <button
        type="button"
        onClick={() =>
          window.open(
            "https://wa.me/",
            "_blank"
          )
        }
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-black text-xl text-[#FFC700] shadow-[0_4px_25px_rgba(0,0,0,0.35)] transition-all duration-300 hover:scale-110 hover:bg-[#1a1a1a] active:scale-95"
        aria-label="Chat support on WhatsApp"
      >
        💬
      </button>

      {/* =====================================================
          VIEW CART FLOATING BAR
      ===================================================== */}

      {cartItemCount > 0 && !showCart && (
        <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">

          <button
            type="button"
            onClick={() =>
              setShowCart(true)
            }
            className="flex w-full items-center justify-between rounded-2xl bg-black px-5 py-4 text-[#FFC700] shadow-[0_8px_35px_rgba(0,0,0,0.3)] transition hover:scale-[1.02] active:scale-[0.98]"
          >

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFC700] text-sm font-black text-black">
                {cartItemCount}
              </div>

              <div className="text-left">

                <p className="text-xs font-bold text-white/60">
                  {cartItemCount}{" "}
                  {cartItemCount === 1
                    ? "item"
                    : "items"}
                </p>

                <p className="text-sm font-black text-white">
                  View Cart
                </p>

              </div>

            </div>

            <div className="text-right">

              <p className="text-[10px] font-bold text-white/50">
                TOTAL
              </p>

              <p className="text-lg font-black">
                ₹{cartTotal}
              </p>

            </div>

            <span className="ml-3 text-xl">
              →
            </span>

          </button>

        </div>
      )}

      {/* =====================================================
          CART MODAL / SCREEN
      ===================================================== */}

      {showCart && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm">

          <div className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-[2rem] bg-[#f7f7f7] shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-h-[90vh] sm:w-[600px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2rem]">

            {/* CART HEADER */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-white px-5 py-4">

              <div>

                <h2 className="text-xl font-black">
                  Your Cart
                </h2>

                <p className="text-xs font-semibold text-black/40">
                  {cartItemCount}{" "}
                  {cartItemCount === 1
                    ? "item"
                    : "items"}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowCart(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-lg font-black transition hover:bg-black/10 active:scale-90"
                aria-label="Close cart"
              >
                ✕
              </button>

            </div>

            {/* CART BODY */}

            <div className="p-4 sm:p-6">

              {cart.length === 0 ? (

                <div className="py-16 text-center">

                  <div className="text-6xl">
                    🛒
                  </div>

                  <h3 className="mt-4 text-lg font-black">
                    Your cart is empty
                  </h3>

                  <p className="mt-1 text-sm text-black/40">
                    Add some products to
                    continue.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setShowCart(false)
                    }
                    className="mt-6 rounded-xl bg-[#FFC700] px-6 py-3 text-sm font-black transition hover:bg-black hover:text-[#FFC700]"
                  >
                    Continue Shopping
                  </button>

                </div>

              ) : (

                <>

                  {/* CART ITEMS */}

                  <div className="space-y-3">

                    {cart.map(
                      (item) => {

                        const price =
                          getProductPrice(
                            item.product
                          );

                        return (
                          <div
                            key={
                              item.product.id
                            }
                            className="flex gap-3 rounded-2xl border border-black/5 bg-white p-3 shadow-sm"
                          >

                            {/* IMAGE */}

                            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f7f7f7]">

                              {item.product
                                .imageUrl ? (
                                <img
                                  src={
                                    item.product
                                      .imageUrl
                                  }
                                  alt={
                                    item.product
                                      .name
                                  }
                                  className="h-full w-full object-contain p-2"
                                />
                              ) : (
                                <span className="text-3xl">
                                  🛍️
                                </span>
                              )}

                            </div>

                            {/* DETAILS */}

                            <div className="min-w-0 flex-1">

                              <div className="flex items-start justify-between gap-2">

                                <h3 className="line-clamp-2 text-sm font-black">
                                  {
                                    item.product
                                      .name
                                  }
                                </h3>

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeFromCart(
                                      item.product
                                        .id
                                    )
                                  }
                                  className="text-xs font-bold text-red-500 hover:text-red-700"
                                >
                                  Remove
                                </button>

                              </div>

                              <p className="mt-1 text-sm font-black">
                                ₹{price}
                              </p>

                              {/* QUANTITY */}

                              <div className="mt-2 flex items-center gap-2">

                                <button
                                  type="button"
                                  onClick={() =>
                                    decreaseQuantity(
                                      item.product
                                        .id
                                    )
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-lg font-black text-[#FFC700] active:scale-90"
                                >
                                  −
                                </button>

                                <span className="min-w-[25px] text-center text-sm font-black">
                                  {
                                    item.quantity
                                  }
                                </span>

                                <button
                                  type="button"
                                  disabled={
                                    item.product
                                      .stock !==
                                      undefined &&
                                    item.quantity >=
                                      item.product
                                        .stock
                                  }
                                  onClick={() =>
                                    increaseQuantity(
                                      item.product
                                        .id
                                    )
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFC700] text-lg font-black active:scale-90 disabled:cursor-not-allowed disabled:bg-black/10 disabled:text-black/30"
                                >
                                  +
                                </button>

                              </div>

                            </div>

                            {/* ITEM TOTAL */}

                            <div className="self-end text-right">

                              <p className="text-sm font-black">
                                ₹
                                {price *
                                  item.quantity}
                              </p>

                            </div>

                          </div>
                        );
                      }
                    )}

                  </div>

                  {/* SUMMARY */}

                  <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">

                    <h3 className="text-sm font-black">
                      Order Summary
                    </h3>

                    <div className="mt-4 space-y-3 text-sm">

                      <div className="flex justify-between">
                        <span className="text-black/50">
                          Subtotal
                        </span>

                        <span className="font-bold">
                          ₹{cartSubtotal}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-black/50">
                          Delivery
                        </span>

                        <span className="font-bold text-emerald-600">
                          FREE
                        </span>
                      </div>

                      <div className="border-t border-black/10 pt-3">

                        <div className="flex justify-between">

                          <span className="font-black">
                            Total
                          </span>

                          <span className="text-lg font-black">
                            ₹{cartTotal}
                          </span>

                        </div>

                      </div>

                    </div>

                  </div>

                  {/* NEXT STEP */}

                  <button
                    type="button"
                    onClick={() => {
                      alert(
                        "Next step: FASTever login with mobile number and OTP."
                      );
                    }}
                    className="mt-5 w-full rounded-2xl bg-[#FFC700] py-4 text-sm font-black text-black shadow-lg transition hover:bg-black hover:text-[#FFC700] active:scale-[0.98]"
                  >
                    CONTINUE TO CHECKOUT →
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowCart(false)
                    }
                    className="mt-3 w-full rounded-2xl bg-black/5 py-3 text-xs font-black text-black/60 transition hover:bg-black/10"
                  >
                    Continue Shopping
                  </button>

                </>

              )}

            </div>

          </div>

        </div>
      )}

    </main>
  );
}