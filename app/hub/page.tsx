"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

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

type ServiceArea = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
};

/* =========================================================
   EXACT SPECIFIED CATEGORIES ONLY
========================================================= */

const defaultCategories: Category[] = [
  { name: "Grocery", icon: "🛒" },
  { name: "Bakery", icon: "🥐" },
  { name: "Meat", icon: "🥩" },
  { name: "Food", icon: "🍔" },
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
   POPULAR SERVICES (TRIGGER APP DOWNLOAD MODAL)
========================================================= */

const popularServices = [
  {
    title: "Home Services",
    description: "Plumber, electrician, AC repair, and maintenance.",
    icon: "🔧",
  },
  {
    title: "Taxi & Ride Booking",
    description: "Book autos, cabs, and local vehicles easily.",
    icon: "🚕",
  },
  {
    title: "Pharmacy Delivery",
    description: "Order medicines and wellness products.",
    icon: "💊",
  },
  {
    title: "Laundry Pickup",
    description: "Wash, iron, and dry clean with doorstep pickup.",
    icon: "👕",
  },
  {
    title: "Salon & Grooming",
    description: "Hair styling, makeup, and beauty appointments.",
    icon: "💇",
  },
  {
    title: "Turf Booking",
    description: "Reserve football and cricket turfs instantly.",
    icon: "🏏",
  },
];

/* =========================================================
   MORE SERVICES (TRIGGER APP DOWNLOAD MODAL)
========================================================= */

const moreServices = [
  "❄️ AC Repair",
  "⚡ Electrician",
  "🧹 House Cleaning",
  "🧪 Lab Tests at Home",
  "🏪 Local Superstore",
  "🛻 Logistics & Pickup",
  "🚌 Tourist Bus Booking",
  "🚿 Car & Bike Wash",
  "🐶 Pet Care Booking",
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
  cake: "🎂",
  cakes: "🎂",
  fruits: "🍎",
  vegetables: "🥦",
  fish: "🐟",
  chicken: "🍗",
  beverages: "🥤",
  drinks: "🥤",
  snacks: "🍿",
  "ice cream": "🍦",
  icecream: "🍦",
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
  return categoryIcons[key] || categoryIcons[key.replace(/\s+/g, "")] || "🛍️";
}

/* =========================================================
   FUZZY TYPO SEARCH HELPER (Levenshtein Distance)
========================================================= */

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }
  return dp[m][n];
}

function fuzzyMatch(query: string, target: string): boolean {
  const q = normalizeText(query);
  const t = normalizeText(target);

  if (!q) return true;
  if (t.includes(q)) return true;

  const tWords = t.split(" ");
  if (tWords.some((w) => w.startsWith(q) || q.startsWith(w))) return true;

  const maxAllowedDistance = q.length > 5 ? 2 : q.length > 3 ? 1 : 0;
  if (maxAllowedDistance > 0) {
    if (levenshteinDistance(q, t) <= maxAllowedDistance) return true;
    if (tWords.some((w) => levenshteinDistance(q, w) <= maxAllowedDistance)) {
      return true;
    }
  }

  return false;
}

/* =========================================================
   HAVERSINE FORMULA
========================================================= */

function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/* =========================================================
   HUB PAGE
========================================================= */

export default function HubPage() {
  const router = useRouter();

  /* =======================================================
     AUTH GATE & USER STATE
  ======================================================= */

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<{
    name?: string;
    phoneNumber?: string;
  } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserProfile(null);
        setCurrentUser(null);
        router.replace("/login");
      } else {
        setCurrentUser(user);

        try {
          const userSnap = await getDoc(doc(db, "website_users", user.uid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            setUserProfile({
              name: data.name || user.displayName || "Customer",
              phoneNumber: data.phoneNumber || user.phoneNumber || "",
            });
          } else {
            setUserProfile({
              name: user.displayName || "Customer",
              phoneNumber: user.phoneNumber || "",
            });
          }
        } catch {
          setUserProfile({
            name: user.displayName || "Customer",
            phoneNumber: user.phoneNumber || "",
          });
        }

        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* =======================================================
     LOGOUT HANDLER
  ======================================================= */

  const handleLogout = async () => {
    try {
      setShowProfileMenu(false);
      await signOut(auth);
    } catch (error) {
      console.error("FASTever: Error signing out:", error);
    }
  };

  /* =======================================================
     LOCATION & COVERAGE (FIRESTORE SYNC)
  ======================================================= */

  const [locationStatus, setLocationStatus] = useState<
    "checking" | "available" | "denied" | "unavailable"
  >("checking");

  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [activeAreaName, setActiveAreaName] = useState<string>("Konni");
  const [maxAllowedDistance, setMaxAllowedDistance] = useState<number>(20);
  const [isOutOfCoverage, setIsOutOfCoverage] = useState<boolean>(false);
  const [calculatedDistance, setCalculatedDistance] = useState<number>(0);

  useEffect(() => {
    const loadDeliverySetup = async () => {
      try {
        const feeDoc = await getDoc(
          doc(db, "deliveryfee", "website_delivery_fee")
        );
        if (feeDoc.exists()) {
          const feeData = feeDoc.data();
          if (feeData.maxDistance) {
            setMaxAllowedDistance(Number(feeData.maxDistance));
          }
        }

        const areasSnap = await getDocs(collection(db, "service_areas"));
        const areas: ServiceArea[] = [];
        areasSnap.forEach((d) => {
          const data = d.data();
          areas.push({
            id: d.id,
            name: data.name || "Office",
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            radiusKm: data.radiusKm ? Number(data.radiusKm) : undefined,
          });
        });
        setServiceAreas(areas);
      } catch (e) {
        console.error("FASTever: Error loading delivery coverage config:", e);
      }
    };

    loadDeliverySetup();
  }, []);

  const evaluateLocationDistance = (
    lat: number,
    lng: number,
    areasList: ServiceArea[] = serviceAreas,
    maxDist: number = maxAllowedDistance
  ) => {
    if (!areasList.length) return;

    const office =
      areasList.find(
        (a) => a.name.toLowerCase() === activeAreaName.toLowerCase()
      ) || areasList[0];

    if (!office) return;

    const dist = calculateDistanceKm(
      lat,
      lng,
      office.latitude,
      office.longitude
    );

    setCalculatedDistance(Math.round(dist * 10) / 10);
    setIsOutOfCoverage(dist > maxDist);
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return;
    }

    setLocationStatus("checking");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocationStatus("available");
        evaluateLocationDistance(lat, lng);
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

  useEffect(() => {
    requestLocation();
  }, [serviceAreas, maxAllowedDistance]);

  const handleSelectArea = (area: ServiceArea) => {
    setActiveAreaName(area.name);
    setIsOutOfCoverage(false);
    setCalculatedDistance(1.5);
    setLocationStatus("available");
  };

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
     FUZZY SEARCH ENGINE
  ======================================================= */

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];

    return allProducts
      .filter((p) => {
        const nameMatches = fuzzyMatch(q, p.name);
        const tagMatches = p.tag.some((t) => fuzzyMatch(q, t));
        return nameMatches || tagMatches;
      })
      .slice(0, 10);
  }, [searchQuery, allProducts]);

  const suggestedTags = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];

    const set = new Set<string>();
    defaultCategories.forEach((c) => {
      if (fuzzyMatch(q, c.name)) set.add(c.name);
    });
    allProducts.forEach((p) => {
      p.tag.forEach((t) => {
        if (fuzzyMatch(q, t)) set.add(t);
      });
    });

    return Array.from(set).slice(0, 5);
  }, [searchQuery, allProducts]);

  /* =======================================================
     APP DOWNLOAD GATEWAY MODAL (FOR NON-HUB SERVICES)
  ======================================================= */

  const [serviceModalData, setServiceModalData] = useState<{
    title: string;
    description: string;
  } | null>(null);

  const openServiceDownloadModal = (title: string, description: string) => {
    setServiceModalData({ title, description });
  };

  /* =======================================================
     ADS
  ======================================================= */

  const [currentAd, setCurrentAd] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentAd((previous) => (previous + 1) % ads.length);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  /* =======================================================
     CART
  ======================================================= */

  const [cart, setCart] = useState<CartItem[]>([]);

  const [showCart, setShowCart] = useState(false);

  const [cartLoaded, setCartLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("fastever_cart");

      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);

        if (Array.isArray(parsedCart)) {
          setCart(parsedCart);
        }
      }
    } catch (error) {
      console.error("FASTever: Unable to load cart:", error);
    } finally {
      setCartLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!cartLoaded) return;

    try {
      localStorage.setItem("fastever_cart", JSON.stringify(cart));
    } catch (error) {
      console.error("FASTever: Unable to save cart:", error);
    }
  }, [cart, cartLoaded]);

  /* =========================================================
     LOAD FIREBASE PRODUCTS
  ========================================================= */

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        setFirebaseError(false);

        const snapshot = await getDocs(
          collection(db, "home_categories")
        );

        const categoryMap = new Map<string, Category>();
        defaultCategories.forEach((cat) => {
          categoryMap.set(normalizeText(cat.name), { ...cat });
        });

        const productsList: ProductItem[] = [];

        snapshot.forEach((docItem) => {
          const data = docItem.data();
          const rawTags = data.tag;
          let tags: string[] = [];

          if (Array.isArray(rawTags)) {
            tags = rawTags
              .filter((tag) => tag !== null && tag !== undefined)
              .map((tag) => String(tag).trim())
              .filter((tag) => tag.length > 0);
          } else if (
            typeof rawTags === "string" &&
            rawTags.trim().length > 0
          ) {
            tags = [rawTags.trim()];
          }

          const product: ProductItem = {
            id: docItem.id,
            name: typeof data.name === "string" ? data.name : "Unnamed Product",
            imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : "",
            price:
              typeof data.price === "number"
                ? data.price
                : Number(data.price) || 0,
            offerPrice:
              data.offerPrice !== undefined && data.offerPrice !== null
                ? Number(data.offerPrice)
                : undefined,
            stock:
              data.stock !== undefined && data.stock !== null
                ? Number(data.stock)
                : undefined,
            tag: tags,
          };

          productsList.push(product);

          tags.forEach((tag) => {
            const categoryKey = normalizeText(tag);
            const existingCategory = categoryMap.get(categoryKey);

            if (existingCategory && !existingCategory.imageUrl && product.imageUrl) {
              categoryMap.set(categoryKey, {
                ...existingCategory,
                imageUrl: product.imageUrl,
              });
            }
          });
        });

        setAllProducts(productsList);
        setCategories(Array.from(categoryMap.values()));
      } catch (error) {
        console.error("FASTever Firebase error:", error);
        setFirebaseError(true);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  const handleCategoryClick = (categoryName: string) => {
    const cleanName = categoryName.trim();

    if (
      selectedCategory &&
      normalizeText(selectedCategory) === normalizeText(cleanName)
    ) {
      setSelectedCategory(null);
      return;
    }

    setSelectedCategory(cleanName);
  };

  const filteredProducts = selectedCategory
    ? allProducts.filter((product) => {
        const selected = normalizeText(selectedCategory);
        return product.tag.some((tag) => normalizeText(tag) === selected);
      })
    : [];

  const getProductPrice = (product: ProductItem) => {
    if (
      product.offerPrice !== undefined &&
      product.offerPrice < product.price
    ) {
      return product.offerPrice;
    }

    return product.price;
  };

  const addToCart = (product: ProductItem) => {
    if (product.stock !== undefined && product.stock <= 0) {
      return;
    }

    setCart((previousCart) => {
      const existingItem = previousCart.find(
        (item) => item.product.id === product.id
      );

      if (existingItem) {
        const currentQuantity = existingItem.quantity;
        const maxStock =
          product.stock !== undefined ? product.stock : Infinity;

        if (currentQuantity >= maxStock) {
          return previousCart;
        }

        return previousCart.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
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

  const increaseQuantity = (productId: string) => {
    setCart((previousCart) =>
      previousCart.map((item) => {
        if (item.product.id !== productId) {
          return item;
        }

        const maxStock =
          item.product.stock !== undefined ? item.product.stock : Infinity;

        if (item.quantity >= maxStock) {
          return item;
        }

        return {
          ...item,
          quantity: item.quantity + 1,
        };
      })
    );
  };

  const decreaseQuantity = (productId: string) => {
    setCart((previousCart) =>
      previousCart
        .map((item) => {
          if (item.product.id !== productId) {
            return item;
          }

          return {
            ...item,
            quantity: item.quantity - 1,
          };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((previousCart) =>
      previousCart.filter((item) => item.product.id !== productId)
    );
  };

  const cartItemCount = useMemo(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + getProductPrice(item.product) * item.quantity,
      0
    );
  }, [cart]);

  const deliveryFee = 0;
  const cartTotal = cartSubtotal + deliveryFee;

  /* =========================================================
     AUTH CHECK LOADER
  ========================================================= */

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFC400]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-black/20 border-t-black" />
      </div>
    );
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="min-h-screen bg-[#f7f7f7] text-[#111] antialiased">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-50 border-b border-[#e5b300] bg-[#FFC700] shadow-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
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

          {/* SMART FUZZY SEARCH BAR */}
          <div className="relative flex-1" ref={searchContainerRef}>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-black/60">
              🔍
            </span>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              placeholder="Search grocery, bakery, meat, food, snacks..."
              className="h-12 w-full rounded-2xl border border-black/15 bg-white/95 pl-11 pr-10 text-sm font-bold text-black placeholder-black/50 shadow-inner outline-none transition focus:border-black focus:bg-white focus:ring-1 focus:ring-black sm:text-base"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-black/40 hover:text-black"
              >
                ✕
              </button>
            )}

            {/* LIVE AUTOCOMPLETE & SUGGESTIONS DROPDOWN */}
            {showSearchDropdown && searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-14 z-50 max-h-[380px] overflow-y-auto rounded-2xl border-2 border-black/10 bg-white p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                {suggestedTags.length > 0 && (
                  <div className="mb-3 border-b border-black/10 pb-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-black/40 mb-1.5">
                      Suggested Categories
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(tag);
                            setShowSearchDropdown(false);
                            setSearchQuery("");
                          }}
                          className="rounded-lg bg-[#FFC700] px-2.5 py-1 text-xs font-black text-black hover:bg-black hover:text-[#FFC700] transition"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[10px] font-black uppercase tracking-wider text-black/40 mb-2">
                  Matching Products ({searchResults.length})
                </p>

                {searchResults.length === 0 ? (
                  <div className="py-5 text-center text-xs font-bold text-black/50">
                    No matching items found for &quot;{searchQuery}&quot;. Try grocery, bakery, or fruits.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {searchResults.map((prod) => {
                      const finalPrice = getProductPrice(prod);
                      return (
                        <div
                          key={prod.id}
                          className="flex items-center justify-between rounded-xl p-2 hover:bg-[#FFFDF0] transition border border-transparent hover:border-[#FFC700]"
                        >
                          <div
                            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                            onClick={() => {
                              if (prod.tag[0]) setSelectedCategory(prod.tag[0]);
                              setShowSearchDropdown(false);
                              setSearchQuery("");
                            }}
                          >
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#f7f7f7] border border-black/5 flex items-center justify-center">
                              {prod.imageUrl ? (
                                <img
                                  src={prod.imageUrl}
                                  alt={prod.name}
                                  className="h-full w-full object-contain p-0.5"
                                />
                              ) : (
                                <span>🛍️</span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black text-black truncate capitalize">
                                {prod.name}
                              </p>
                              <p className="text-[10px] font-bold text-black/50">
                                {prod.tag.join(", ") || "General"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-black text-black">
                              ₹{finalPrice}
                            </span>
                            <button
                              type="button"
                              onClick={() => addToCart(prod)}
                              className="rounded-lg bg-[#FFC700] px-2.5 py-1 text-[11px] font-black text-black hover:bg-black hover:text-[#FFC700] transition active:scale-95"
                            >
                              + ADD
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* LOCATION BUTTONS */}
            <button
              type="button"
              onClick={requestLocation}
              className={`hidden items-center gap-2 rounded-xl border px-3.5 py-3 text-sm font-bold shadow-sm transition active:scale-95 sm:flex ${
                locationStatus === "available"
                  ? isOutOfCoverage
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-emerald-700 bg-emerald-600 text-white"
                  : "border-black/20 bg-black/10 text-black hover:bg-black hover:text-[#FFC700]"
              }`}
            >
              <span>📍</span>
              <span>
                {locationStatus === "available"
                  ? isOutOfCoverage
                    ? `Out of Range (${calculatedDistance}km)`
                    : `${activeAreaName} (In Range)`
                  : locationStatus === "checking"
                  ? "Checking..."
                  : "Turn On Location"}
              </span>
            </button>

            <button
              type="button"
              onClick={requestLocation}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-base shadow-sm transition active:scale-95 sm:hidden ${
                locationStatus === "available"
                  ? isOutOfCoverage
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-emerald-700 bg-emerald-600 text-white"
                  : "border-black/20 bg-black/10 text-black hover:bg-black hover:text-[#FFC700]"
              }`}
              aria-label="Set Location"
            >
              📍
            </button>

            {/* PROFILE & LOGOUT DROPDOWN */}
            {currentUser && (
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  className="flex h-12 items-center gap-2 rounded-xl border border-black/20 bg-black px-3.5 py-2 text-xs font-black text-[#FFC700] shadow-sm transition hover:bg-zinc-900 active:scale-95"
                >
                  <span className="text-sm">👤</span>
                  <span className="hidden max-w-[120px] truncate sm:inline">
                    {userProfile?.name || currentUser.displayName || "Account"}
                  </span>
                  <span className="text-[10px] text-white/70">▼</span>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 top-14 z-50 w-64 rounded-2xl border-2 border-black/10 bg-white p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                    <div className="border-b border-black/10 pb-3">
                      <p className="text-[11px] font-black uppercase tracking-wider text-black/40">
                        Active Account
                      </p>
                      <p className="mt-1 text-sm font-black text-black truncate">
                        {userProfile?.name ||
                          currentUser.displayName ||
                          "FASTever Customer"}
                      </p>
                      <p className="text-xs font-bold text-black/60 truncate">
                        {userProfile?.phoneNumber ||
                          currentUser.phoneNumber ||
                          "Verified Phone"}
                      </p>
                    </div>

                    <div className="pt-3">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-red-700 active:scale-95 shadow-sm"
                      >
                        <span>🚪</span>
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN BODY
      ===================================================== */}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* LOCATION WARNING */}
        {locationStatus === "denied" && (
          <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border-2 border-orange-300 bg-orange-50 p-4 sm:p-5 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <p className="text-base font-black text-orange-950">
                  Location is turned off
                </p>
              </div>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-orange-900/80">
                Please enable location access to verify if your address is
                within our delivery radius ({maxAllowedDistance} km).
              </p>
            </div>

            <button
              type="button"
              onClick={requestLocation}
              className="w-full sm:w-auto shrink-0 rounded-2xl bg-[#FFC700] px-6 py-3 text-xs font-black uppercase tracking-wider text-black shadow-md transition hover:bg-black hover:text-[#FFC700] active:scale-95"
            >
              Enable Location 📍
            </button>
          </div>
        )}

        {/* FIREBASE ERROR */}
        {firebaseError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-black text-red-800">
              Unable to load FASTever products.
            </p>
            <p className="mt-1 text-xs text-red-700">
              Check your Firebase configuration and Firestore permissions.
            </p>
          </div>
        )}

        {/* =====================================================
            CASE: OUT OF COVERAGE (> maxDistance km)
        ===================================================== */}
        {isOutOfCoverage ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="overflow-hidden rounded-3xl border-2 border-[#FFC700] bg-white p-6 sm:p-10 shadow-xl text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#FFC700]/15 text-4xl shadow-inner mb-4">
                🚚
              </div>

              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-700">
                Out of Delivery Area
              </span>

              <h2 className="mt-3 text-2xl sm:text-4xl font-black text-black">
                We are coming to your area soon!
              </h2>

              <p className="mx-auto mt-2 max-w-lg text-sm sm:text-base font-medium text-black/60 leading-6">
                You are currently{" "}
                <strong className="text-black font-black">
                  {calculatedDistance} km
                </strong>{" "}
                away from our nearest service hub. Our current maximum delivery
                distance is{" "}
                <strong className="text-black font-black">
                  {maxAllowedDistance} km
                </strong>
                .
              </p>

              <div className="mt-6 rounded-2xl bg-[#f7f7f7] border border-black/10 p-4 max-w-md mx-auto">
                <p className="text-xs font-black uppercase tracking-wider text-black/50 mb-2">
                  Or select our active delivery hub
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectArea({
                        id: "konni",
                        name: "Konni",
                        latitude: 9.226888,
                        longitude: 76.849616,
                      })
                    }
                    className="rounded-xl bg-[#FFC700] px-4 py-2.5 text-xs font-black text-black shadow hover:bg-black hover:text-[#FFC700] transition active:scale-95"
                  >
                    📍 Switch to Konni Hub (Deliver Here)
                  </button>
                </div>
              </div>

              <div className="mt-8 border-t border-black/10 pt-6">
                <p className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-black/60 mb-4 animate-pulse">
                  Get FASTever on your mobile
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <a
                    href="https://apps.apple.com/app/fastever/id6763805908"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition duration-300 hover:scale-105 active:scale-95"
                  >
                    <img
                      src="/ios.png"
                      alt="Download on the App Store"
                      className="h-11 sm:h-13 w-auto object-contain drop-shadow"
                    />
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.fastever.customer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition duration-300 hover:scale-105 active:scale-95"
                  >
                    <img
                      src="/playstore.png"
                      alt="Get it on Google Play"
                      className="h-11 sm:h-13 w-auto object-contain drop-shadow"
                    />
                  </a>
                </div>
              </div>
            </div>

            <section>
              <div className="relative h-[210px] overflow-hidden rounded-3xl bg-gradient-to-r from-[#FFC700] via-[#F5B700] to-[#FFC700] shadow-xl sm:h-[250px]">
                {ads.map((ad, index) => (
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
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          /* =====================================================
              CASE: IN COVERAGE - EXACT REQUESTED CATEGORIES
          ===================================================== */
          <>
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                    What do you need?
                  </h1>
                  <p className="mt-1 text-sm text-black/50">
                    Explore everything available on FASTever in {activeAreaName}
                  </p>
                </div>

                {selectedCategory && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
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

              {/* HORIZONTAL CATEGORY SCROLLER WITH EXACT REQUESTED LIST */}
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {categories.map((category) => {
                  const isSelected =
                    selectedCategory &&
                    normalizeText(selectedCategory) ===
                      normalizeText(category.name);

                  return (
                    <button
                      key={category.name}
                      type="button"
                      onClick={() => handleCategoryClick(category.name)}
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
                            src={category.imageUrl}
                            alt={category.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                          />
                        ) : (
                          <span className="text-3xl">
                            {category.icon || getCategoryIcon(category.name)}
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
                })}
              </div>
            </section>

            {/* SELECTED CATEGORY PRODUCTS */}
            {selectedCategory && (
              <section className="mt-6 rounded-3xl border border-[#FFC700]/50 bg-white p-6 shadow-md">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black capitalize text-black">
                      {selectedCategory} Items
                    </h2>
                    <p className="mt-1 text-xs font-semibold text-black/40">
                      {filteredProducts.length} item
                      {filteredProducts.length === 1 ? "" : "s"} available
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
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
                ) : filteredProducts.length === 0 ? (
                  <div className="rounded-2xl bg-[#fafafa] py-10 text-center">
                    <div className="text-5xl">🛍️</div>
                    <p className="mt-3 text-sm font-black text-black/70">
                      No items available in this category
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {filteredProducts.map((product) => {
                      const hasOffer =
                        product.offerPrice !== undefined &&
                        product.offerPrice < product.price;

                      const displayPrice = hasOffer
                        ? product.offerPrice!
                        : product.price;

                      const cartItem = cart.find(
                        (item) => item.product.id === product.id
                      );
                      const quantity = cartItem?.quantity || 0;
                      const isOutOfStock =
                        product.stock !== undefined && product.stock <= 0;
                      const reachedStock =
                        product.stock !== undefined &&
                        quantity >= product.stock;

                      return (
                        <div
                          key={product.id}
                          className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-[#fafafa] p-3 shadow-sm transition hover:-translate-y-1 hover:border-[#FFC700] hover:shadow-lg"
                        >
                          <div className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-xl bg-white">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <span className="text-4xl">🛍️</span>
                            )}

                            {hasOffer && (
                              <span className="absolute left-2 top-2 rounded-lg bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
                                SAVE ₹{product.price - product.offerPrice!}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex flex-1 flex-col justify-between">
                            <div>
                              <h3 className="line-clamp-2 text-sm font-black capitalize text-black">
                                {product.name}
                              </h3>

                              {product.stock !== undefined && (
                                <p
                                  className={`mt-1 text-[10px] font-bold ${
                                    product.stock > 0
                                      ? "text-emerald-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {product.stock > 0
                                    ? `In Stock: ${product.stock}`
                                    : "Out of stock"}
                                </p>
                              )}
                            </div>

                            <div className="mt-3">
                              <div className="flex items-center gap-1.5">
                                <span className="text-base font-black text-black">
                                  ₹{displayPrice}
                                </span>
                                {hasOffer && (
                                  <span className="text-xs text-black/40 line-through">
                                    ₹{product.price}
                                  </span>
                                )}
                              </div>

                              <div className="mt-2">
                                {isOutOfStock ? (
                                  <button
                                    type="button"
                                    disabled
                                    className="w-full cursor-not-allowed rounded-xl bg-black/10 py-2 text-xs font-black text-black/30"
                                  >
                                    OUT OF STOCK
                                  </button>
                                ) : quantity === 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => addToCart(product)}
                                    className="w-full rounded-xl bg-[#FFC700] py-2 text-xs font-black text-black transition hover:bg-black hover:text-[#FFC700] active:scale-95"
                                  >
                                    ADD +
                                  </button>
                                ) : (
                                  <div className="flex items-center justify-between rounded-xl bg-[#FFC700] p-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        decreaseQuantity(product.id)
                                      }
                                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-lg font-black text-[#FFC700] active:scale-90"
                                    >
                                      −
                                    </button>

                                    <span className="text-sm font-black">
                                      {quantity}
                                    </span>

                                    <button
                                      type="button"
                                      disabled={reachedStock}
                                      onClick={() =>
                                        increaseQuantity(product.id)
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
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ADVERTISEMENT BANNER */}
            <section className="mt-8">
              <div className="relative h-[210px] overflow-hidden rounded-3xl bg-gradient-to-r from-[#FFC700] via-[#F5B700] to-[#FFC700] shadow-xl sm:h-[250px]">
                {ads.map((ad, index) => (
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
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* POPULAR SERVICES (OPENS APP DOWNLOAD GATEWAY) */}
            <section className="mt-10">
              <div className="mb-5">
                <h2 className="text-2xl font-black sm:text-3xl">
                  Explore FASTever
                </h2>
                <p className="mt-1 text-sm text-black/50">
                  Local services, shopping and delivery — all in one place.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {popularServices.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() =>
                      openServiceDownloadModal(item.title, item.description)
                    }
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
                ))}
              </div>
            </section>

            {/* MORE SERVICES (OPENS APP DOWNLOAD GATEWAY) */}
            <section className="mt-12 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-black">More from FASTever</h2>
                <p className="mt-1 text-sm text-black/50">
                  Everything you may need around your city.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {moreServices.map((service) => (
                  <button
                    key={service}
                    type="button"
                    onClick={() =>
                      openServiceDownloadModal(
                        service,
                        "Available exclusively on our mobile application."
                      )
                    }
                    className="rounded-2xl border border-black/5 bg-[#fafafa] px-3 py-4 text-center text-sm font-bold transition hover:border-[#FFC700] hover:bg-[#FFF9E6] hover:text-black active:scale-95"
                  >
                    {service}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {/* =====================================================
          APP DOWNLOAD GATEWAY MODAL (FOR SERVICES & RETURN HOME)
      ===================================================== */}

      {serviceModalData && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border-2 border-[#FFC700] bg-black text-white shadow-2xl p-6 sm:p-8 text-center">
            {/* BACKGROUND VIDEO OVERLAY */}
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="absolute inset-0 h-full w-full object-cover opacity-20 blur-[1px] pointer-events-none"
            >
              <source src="/delivery.mp4" type="video/mp4" />
            </video>

            {/* CLOSE BUTTON */}
            <button
              type="button"
              onClick={() => setServiceModalData(null)}
              className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white font-black hover:bg-white hover:text-black transition"
            >
              ✕
            </button>

            <div className="relative z-10">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFC700] text-black text-3xl shadow-lg">
                📲
              </div>

              <span className="rounded-full bg-[#FFC700]/20 border border-[#FFC700]/50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#FFC700]">
                App Exclusive Service
              </span>

              <h2 className="mt-3 text-2xl sm:text-3xl font-black text-white">
                {serviceModalData.title}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm font-medium text-white/80 leading-6">
                To enjoy all our services, exciting service offers, and direct customer support, please use our mobile application.
              </p>

              {/* STORE BADGES */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                <a
                  href="https://apps.apple.com/app/fastever/id6763805908"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:scale-105 active:scale-95"
                >
                  <img
                    src="/ios.png"
                    alt="Download on the App Store"
                    className="h-11 sm:h-13 w-auto object-contain drop-shadow"
                  />
                </a>

                <a
                  href="https://play.google.com/store/apps/details?id=com.fastever.customer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:scale-105 active:scale-95"
                >
                  <img
                    src="/playstore.png"
                    alt="Get it on Google Play"
                    className="h-11 sm:h-13 w-auto object-contain drop-shadow"
                  />
                </a>
              </div>

              {/* RETURN BUTTON TO MAIN SCREEN */}
              <div className="mt-8 border-t border-white/15 pt-5 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="flex-1 rounded-2xl bg-white/10 border border-white/20 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-white hover:text-black transition active:scale-95"
                >
                  ← Return to Main Screen
                </button>

                <button
                  type="button"
                  onClick={() => setServiceModalData(null)}
                  className="flex-1 rounded-2xl bg-[#FFC700] py-3 text-xs font-black uppercase tracking-wider text-black hover:bg-yellow-300 transition active:scale-95"
                >
                  Stay on HUB
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                Your local super-app for food, shopping, bookings, deliveries,
                and everyday services.
              </p>
            </div>

            <div>
              <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-black">
                Services
              </h3>
              <div className="space-y-3 text-sm font-bold text-black/75">
                <span className="block cursor-default select-none transition hover:text-black">
                  Grocery & Food
                </span>
                <span className="block cursor-default select-none transition hover:text-black">
                  Bakery & Cakes
                </span>
                <span className="block cursor-default select-none transition hover:text-black">
                  Meat & Seafood
                </span>
                <span className="block cursor-default select-none transition hover:text-black">
                  Local Deliveries
                </span>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-black">
                Company
              </h3>
              <div className="space-y-3 text-sm font-bold text-black/75">
                <span className="block cursor-default select-none transition hover:text-black">
                  About FASTever
                </span>
                <span className="block cursor-default select-none transition hover:text-black">
                  Contact Us
                </span>
                <span className="block cursor-default select-none transition hover:text-black">
                  Careers
                </span>
                <span className="block cursor-default select-none transition hover:text-black">
                  Become a Partner
                </span>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-black">
                Legal & Support
              </h3>
              <div className="space-y-3 text-sm font-bold text-black/75">
                <span className="block cursor-default select-none transition hover:text-black">
                  Privacy Policy
                </span>
                <span className="block cursor-default select-none transition hover:text-black">
                  Terms & Conditions
                </span>
                <span className="block cursor-default select-none transition hover:text-black">
                  Refund Policy
                </span>
                <span className="block cursor-default select-none transition hover:text-black">
                  Help & Support
                </span>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-black/15 pt-6 text-xs font-bold text-black/75 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} FASTever. All rights reserved.</p>
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
        onClick={() => window.open("https://wa.me/", "_blank")}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-black text-xl text-[#FFC700] shadow-[0_4px_25px_rgba(0,0,0,0.35)] transition-all duration-300 hover:scale-110 hover:bg-[#1a1a1a] active:scale-95"
        aria-label="Chat support on WhatsApp"
      >
        💬
      </button>

      {/* =====================================================
          VIEW CART FLOATING BAR
      ===================================================== */}

      {cartItemCount > 0 && !showCart && !isOutOfCoverage && (
        <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <button
            type="button"
            onClick={() => setShowCart(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-black px-5 py-4 text-[#FFC700] shadow-[0_8px_35px_rgba(0,0,0,0.3)] transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFC700] text-sm font-black text-black">
                {cartItemCount}
              </div>

              <div className="text-left">
                <p className="text-xs font-bold text-white/60">
                  {cartItemCount} {cartItemCount === 1 ? "item" : "items"}
                </p>
                <p className="text-sm font-black text-white">View Cart</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-bold text-white/50">TOTAL</p>
              <p className="text-lg font-black">₹{cartTotal}</p>
            </div>

            <span className="ml-3 text-xl">→</span>
          </button>
        </div>
      )}

      {/* =====================================================
          CART MODAL
      ===================================================== */}

      {showCart && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm">
          <div className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-[2rem] bg-[#f7f7f7] shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-h-[90vh] sm:w-[600px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2rem]">
            {/* CART HEADER */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-white px-5 py-4">
              <div>
                <h2 className="text-xl font-black">Your Cart</h2>
                <p className="text-xs font-semibold text-black/40">
                  {cartItemCount} {cartItemCount === 1 ? "item" : "items"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCart(false)}
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
                  <div className="text-6xl">🛒</div>
                  <h3 className="mt-4 text-lg font-black">Your cart is empty</h3>
                  <p className="mt-1 text-sm text-black/40">
                    Add some products to continue.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCart(false)}
                    className="mt-6 rounded-xl bg-[#FFC700] px-6 py-3 text-sm font-black transition hover:bg-black hover:text-[#FFC700]"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {cart.map((item) => {
                      const price = getProductPrice(item.product);
                      const reachedStock =
                        item.product.stock !== undefined &&
                        item.quantity >= item.product.stock;

                      return (
                        <div
                          key={item.product.id}
                          className="flex gap-3 rounded-2xl border border-black/5 bg-white p-3 shadow-sm"
                        >
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f7f7f7]">
                            {item.product.imageUrl ? (
                              <img
                                src={item.product.imageUrl}
                                alt={item.product.name}
                                className="h-full w-full object-contain p-2"
                              />
                            ) : (
                              <span className="text-3xl">🛍️</span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="line-clamp-2 text-sm font-black">
                                {item.product.name}
                              </h3>

                              <button
                                type="button"
                                onClick={() =>
                                  removeFromCart(item.product.id)
                                }
                                className="text-xs font-bold text-red-500 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </div>

                            <p className="mt-1 text-sm font-black">₹{price}</p>

                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  decreaseQuantity(item.product.id)
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-lg font-black text-[#FFC700] active:scale-90"
                              >
                                −
                              </button>

                              <span className="min-w-[25px] text-center text-sm font-black">
                                {item.quantity}
                              </span>

                              <button
                                type="button"
                                disabled={reachedStock}
                                onClick={() =>
                                  increaseQuantity(item.product.id)
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
                          </div>

                          <div className="self-end text-right">
                            <p className="text-sm font-black">
                              ₹{price * item.quantity}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-black">Order Summary</h3>

                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-black/50">Subtotal</span>
                        <span className="font-bold">₹{cartSubtotal}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-black/50">Delivery</span>
                        <span className="font-bold text-emerald-600">FREE</span>
                      </div>

                      <div className="border-t border-black/10 pt-3">
                        <div className="flex justify-between">
                          <span className="font-black">Total</span>
                          <span className="text-lg font-black">
                            ₹{cartTotal}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push("/cart")}
                    className="mt-5 w-full rounded-2xl bg-[#FFC700] py-4 text-sm font-black text-black shadow-lg transition hover:bg-black hover:text-[#FFC700] active:scale-[0.98]"
                  >
                    CONTINUE TO CHECKOUT →
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCart(false)}
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