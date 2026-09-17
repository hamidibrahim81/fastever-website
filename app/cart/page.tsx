"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  setDoc,
  serverTimestamp,
  GeoPoint,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

declare global {
  interface Window {
    google?: any;
    gm_authFailure?: () => void;
  }
}

const GOOGLE_MAPS_API_KEY = "AIzaSyANpMIVfV3g-hBVADle366zuW_3k2uPOdA";

/* =========================================================
   TYPES
========================================================= */

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

type AddressItem = {
  id?: string;
  category: "Home" | "Office" | "Other";
  recipient_name: string;
  phone: string;
  house_no: string;
  street_area: string;
  landmark?: string;
  full_display_address: string;
  lat: number;
  lng: number;
  updatedAt?: any;
};

type DeliveryFeeConfig = {
  baseFee: number;
  baseKm: number;
  perKmFee: number;
  platformFee: number;
  maxDistance: number;
};

/* =========================================================
   HAVERSINE DISTANCE FORMULA (KM)
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

export default function CartPage() {
  const router = useRouter();

  /* =========================================================
     AUTH & USER
  ========================================================= */

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfileName, setUserProfileName] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login?returnTo=cart");
      } else {
        setCurrentUser(user);
        try {
          const uDoc = await getDoc(doc(db, "website_users", user.uid));
          if (uDoc.exists()) {
            setUserProfileName(uDoc.data()?.name || user.displayName || "");
          } else {
            setUserProfileName(user.displayName || "");
          }
        } catch {
          setUserProfileName(user.displayName || "");
        }
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  /* =========================================================
     CART STATE (LOCAL STORAGE SYNC)
  ========================================================= */

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fastever_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCart(parsed);
      }
    } catch (e) {
      console.error("Cart load error:", e);
    } finally {
      setCartLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!cartLoaded) return;
    try {
      localStorage.setItem("fastever_cart", JSON.stringify(cart));
    } catch (e) {
      console.error("Cart save error:", e);
    }
  }, [cart, cartLoaded]);

  const increaseQuantity = (productId: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        const maxStock =
          item.product.stock !== undefined ? item.product.stock : Infinity;
        if (item.quantity >= maxStock) return item;
        return { ...item, quantity: item.quantity + 1 };
      })
    );
  };

  const decreaseQuantity = (productId: string) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          return { ...item, quantity: item.quantity - 1 };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const cartSubtotal = useMemo(() => {
    return cart.reduce((total, item) => {
      const price =
        item.product.offerPrice !== undefined &&
        item.product.offerPrice < item.product.price
          ? item.product.offerPrice
          : item.product.price;
      return total + price * item.quantity;
    }, 0);
  }, [cart]);

  /* =========================================================
     DELIVERY CONFIG & SERVICE AREAS
  ========================================================= */

  const [feeConfig, setFeeConfig] = useState<DeliveryFeeConfig>({
    baseFee: 25,
    baseKm: 2,
    perKmFee: 8,
    platformFee: 10,
    maxDistance: 20,
  });

  const [officeLocation, setOfficeLocation] = useState({
    lat: 9.226888,
    lng: 76.849616,
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const feeDoc = await getDoc(
          doc(db, "deliveryfee", "website_delivery_fee")
        );
        if (feeDoc.exists()) {
          const d = feeDoc.data();
          setFeeConfig({
            baseFee: Number(d.baseFee ?? 25),
            baseKm: Number(d.baseKm ?? 2),
            perKmFee: Number(d.perKmFee ?? 8),
            platformFee: Number(d.platformFee ?? 10),
            maxDistance: Number(d.maxDistance ?? 20),
          });
        }

        const areaSnap = await getDocs(collection(db, "service_areas"));
        areaSnap.forEach((d) => {
          const ad = d.data();
          if (ad.latitude && ad.longitude) {
            setOfficeLocation({
              lat: Number(ad.latitude),
              lng: Number(ad.longitude),
            });
          }
        });
      } catch (err) {
        console.error("Config fetch error:", err);
      }
    };

    fetchConfig();
  }, []);

  /* =========================================================
     PAYMENT METHOD SELECTION
  ========================================================= */

  const [paymentMethod, setPaymentMethod] = useState<"COD" | "UPI">("COD");

  /* =========================================================
     ADDRESSES LIST & SELECTION
  ========================================================= */

  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<AddressItem | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const [showManageModal, setShowManageModal] = useState(false);
  const [showMapFlow, setShowMapFlow] = useState(false);
  const [mapStep, setMapStep] = useState<"map" | "form">("map");

  const fetchAddresses = async (userId: string) => {
    setLoadingAddresses(true);
    try {
      const snap = await getDocs(
        collection(db, "website_users", userId, "addresses")
      );
      const list: AddressItem[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as AddressItem) });
      });

      setAddresses(list);
      if (list.length > 0) {
        setSelectedAddress((prev) => {
          if (!prev) return list[0];
          const found = list.find((a) => a.id === prev.id);
          return found || list[0];
        });
      } else {
        setSelectedAddress(null);
      }
    } catch (e) {
      console.error("Fetch addresses error:", e);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchAddresses(currentUser.uid);
    }
  }, [currentUser]);

  const handleDeleteAddress = async (addressId: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(
        doc(db, "website_users", currentUser.uid, "addresses", addressId)
      );
      await fetchAddresses(currentUser.uid);
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  /* =========================================================
     MAP & GEOLOCATION STATE
  ========================================================= */

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);

  const [isMapsLoaded, setIsMapsLoaded] = useState(false);
  const [mapApiFailed, setMapApiFailed] = useState(false);

  const [mapCenterCoords, setMapCenterCoords] = useState({
    lat: 9.226888,
    lng: 76.849616,
  });
  const [mapGeocodedAddress, setMapGeocodedAddress] = useState(
    "Konni, Pathanamthitta, Kerala"
  );
  const [mapDistance, setMapDistance] = useState<number>(0);
  const [isMapServiceable, setIsMapServiceable] = useState(true);

  // Address Details Form fields
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [streetArea, setStreetArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [category, setCategory] = useState<"Home" | "Office" | "Other">("Home");
  const [savingAddress, setSavingAddress] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    window.gm_authFailure = () => {
      setMapApiFailed(true);
    };

    if (window.google?.maps) {
      setIsMapsLoaded(true);
      return;
    }

    const scriptId = "google-maps-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsMapsLoaded(true);
      script.onerror = () => setMapApiFailed(true);
      document.head.appendChild(script);
    }
  }, []);

  const reverseGeocode = useCallback(
    (lat: number, lng: number) => {
      if (window.google?.maps && !mapApiFailed) {
        try {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat, lng } },
            (results: any, status: string) => {
              if (status === "OK" && results?.[0]) {
                setMapGeocodedAddress(results[0].formatted_address);
              } else {
                setMapGeocodedAddress(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
              }
            }
          );
        } catch {
          setMapGeocodedAddress(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
        }
      } else {
        setMapGeocodedAddress(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)} (GPS Selected)`);
      }

      const dist = calculateDistanceKm(
        officeLocation.lat,
        officeLocation.lng,
        lat,
        lng
      );
      const roundedDist = Math.round(dist * 10) / 10;
      setMapDistance(roundedDist);
      setIsMapServiceable(roundedDist <= feeConfig.maxDistance);
    },
    [officeLocation, feeConfig.maxDistance, mapApiFailed]
  );

  useEffect(() => {
    if (
      !showMapFlow ||
      mapStep !== "map" ||
      !isMapsLoaded ||
      mapApiFailed ||
      !mapContainerRef.current
    ) {
      return;
    }

    try {
      const initialPos = { lat: mapCenterCoords.lat, lng: mapCenterCoords.lng };

      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: initialPos,
        zoom: 16,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
      });

      mapInstanceRef.current = map;

      map.addListener("idle", () => {
        const center = map.getCenter();
        if (center) {
          const lat = center.lat();
          const lng = center.lng();
          setMapCenterCoords({ lat, lng });
          reverseGeocode(lat, lng);
        }
      });

      if (searchInputRef.current && window.google?.maps?.places) {
        const autocomplete = new window.google.maps.places.Autocomplete(
          searchInputRef.current,
          {
            componentRestrictions: { country: "in" },
            fields: ["geometry", "name", "formatted_address"],
          }
        );
        autocompleteRef.current = autocomplete;

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (place.geometry?.location) {
            map.panTo(place.geometry.location);
            map.setZoom(17);
          }
        });
      }

      reverseGeocode(initialPos.lat, initialPos.lng);
    } catch {
      setMapApiFailed(true);
    }
  }, [showMapFlow, mapStep, isMapsLoaded, mapApiFailed, reverseGeocode]);

  const panToCurrentGps = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMapCenterCoords({ lat, lng });
        reverseGeocode(lat, lng);

        if (mapInstanceRef.current && !mapApiFailed) {
          mapInstanceRef.current.panTo({ lat, lng });
          mapInstanceRef.current.setZoom(17);
        }
      },
      () => {
        alert("Location access denied or unavailable.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleConfirmMapLocation = () => {
    if (!isMapServiceable) {
      alert(`Location is out of our current delivery zone (${feeConfig.maxDistance} km max).`);
      return;
    }
    setStreetArea(mapGeocodedAddress);
    setMapStep("form");
  };

  const handleSaveAddressDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!currentUser) return;
    if (addresses.length >= 3) {
      setFormError("Address limit reached (Maximum 3 allowed). Delete one to add a new one.");
      return;
    }
    if (!recipientName.trim() || !houseNo.trim() || !streetArea.trim()) {
      setFormError("Please fill in all mandatory fields.");
      return;
    }

    setSavingAddress(true);

    try {
      const fullDisplay = `${houseNo.trim()}, ${streetArea.trim()}${
        landmark.trim() ? `, Near ${landmark.trim()}` : ""
      }`;

      const newId = doc(collection(db, "temp")).id;

      const payload: AddressItem = {
        category,
        recipient_name: recipientName.trim(),
        phone: phone.trim() || currentUser.phoneNumber || "",
        house_no: houseNo.trim(),
        street_area: streetArea.trim(),
        landmark: landmark.trim(),
        full_display_address: fullDisplay,
        lat: mapCenterCoords.lat,
        lng: mapCenterCoords.lng,
        updatedAt: serverTimestamp(),
      };

      await setDoc(
        doc(db, "website_users", currentUser.uid, "addresses", newId),
        payload
      );

      const created = { id: newId, ...payload };
      setSelectedAddress(created);

      setShowMapFlow(false);
      setShowManageModal(false);
      setMapStep("map");
      setRecipientName("");
      setPhone("");
      setHouseNo("");
      setStreetArea("");
      setLandmark("");

      await fetchAddresses(currentUser.uid);
    } catch (err: any) {
      console.error("Save error:", err);
      setFormError(err.message || "Failed to save address.");
    } finally {
      setSavingAddress(false);
    }
  };

  /* =========================================================
     BILL & DELIVERY CHARGE CALCULATION
  ========================================================= */

  const deliveryCalculations = useMemo(() => {
    if (!selectedAddress || !selectedAddress.lat || !selectedAddress.lng) {
      return {
        distanceKm: 0,
        deliveryCharge: feeConfig.baseFee,
        isDeliverable: true,
      };
    }

    const dist = calculateDistanceKm(
      officeLocation.lat,
      officeLocation.lng,
      selectedAddress.lat,
      selectedAddress.lng
    );

    const roundedDist = Math.max(1, Math.round(dist * 10) / 10);

    if (roundedDist > feeConfig.maxDistance) {
      return {
        distanceKm: roundedDist,
        deliveryCharge: 0,
        isDeliverable: false,
      };
    }

    let fee = feeConfig.baseFee;
    if (roundedDist > feeConfig.baseKm) {
      const extraKm = roundedDist - feeConfig.baseKm;
      fee += Math.ceil(extraKm) * feeConfig.perKmFee;
    }

    return {
      distanceKm: roundedDist,
      deliveryCharge: fee,
      isDeliverable: true,
    };
  }, [selectedAddress, feeConfig, officeLocation]);

  const grandTotal =
    cartSubtotal +
    (deliveryCalculations.isDeliverable
      ? deliveryCalculations.deliveryCharge
      : 0) +
    feeConfig.platformFee;

  /* =========================================================
     PLACE ORDER
  ========================================================= */

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const generateOrderId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 20; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handlePlaceOrder = async () => {
    if (!currentUser || !selectedAddress) return;
    if (!deliveryCalculations.isDeliverable) {
      alert("This address is outside our delivery zone. Please select another address.");
      return;
    }
    if (cart.length === 0) return;

    setIsPlacingOrder(true);

    try {
      const orderId = generateOrderId();
      const nowIso = new Date().toISOString();
      const customerName =
        selectedAddress.recipient_name ||
        userProfileName ||
        currentUser.displayName ||
        "Customer";
      const customerPhone =
        selectedAddress.phone || currentUser.phoneNumber || "";

      const orderItems = cart.map((c) => ({
        id: c.product.id,
        name: c.product.name,
        image: c.product.imageUrl || "",
        price:
          c.product.offerPrice !== undefined &&
          c.product.offerPrice < c.product.price
            ? c.product.offerPrice
            : c.product.price,
        quantity: c.quantity,
        restaurantId: "FASTever_Hub",
        restaurantName: "FASTever Store",
      }));

      // 1. ORDER STATUS
      const orderStatusPayload = {
        orderId,
        userId: currentUser.uid,
        userName: customerName,
        userPhone: customerPhone,
        address: `${selectedAddress.recipient_name} ${selectedAddress.phone} ${selectedAddress.full_display_address}`,
        destinationLocation: [
          new GeoPoint(selectedAddress.lat, selectedAddress.lng),
        ],
        location: {
          latitude: selectedAddress.lat,
          longitude: selectedAddress.lng,
          geoPoint: new GeoPoint(selectedAddress.lat, selectedAddress.lng),
        },
        items: orderItems,
        deliveryFee: deliveryCalculations.deliveryCharge,
        platformFee: feeConfig.platformFee,
        discount: 0,
        subtotal: cartSubtotal,
        total: grandTotal,
        payment: paymentMethod,
        platform: "website",
        deliveryInstructions: "",
        appliedCouponCode: null,
        fcmToken: "",
        adminCall1Done: false,
        adminCall2Done: false,
        adminCall3Done: false,
        restaurantCall1Done: false,
        createdAt: nowIso,
        statusHistory: [
          {
            status: "pending",
            changedBy: "customer_website",
            timestamp: nowIso,
          },
        ],
      };

      // 2. DELIVERY PARTNER ORDERS
      const deliveryPartnerPayload = {
        orderId,
        userId: currentUser.uid,
        userName: customerName,
        userPhone: customerPhone,
        address: `${selectedAddress.recipient_name} ${selectedAddress.phone} ${selectedAddress.full_display_address}`,
        destinationLocation: [
          new GeoPoint(selectedAddress.lat, selectedAddress.lng),
        ],
        location: {
          latitude: selectedAddress.lat,
          longitude: selectedAddress.lng,
          geoPoint: new GeoPoint(selectedAddress.lat, selectedAddress.lng),
        },
        items: orderItems,
        deliveryFee: deliveryCalculations.deliveryCharge,
        deliveryInstructions: "",
        payment: paymentMethod,
        restaurantIds: ["FASTever_Hub"],
        status: "searching_for_partner",
        total: grandTotal,
        createdAt: nowIso,
        timestamp: serverTimestamp(),
      };

      // 3. MASTER ORDERS COLLECTION
      const masterOrderPayload = {
        orderId,
        userId: currentUser.uid,
        userName: customerName,
        userPhone: customerPhone,
        items: orderItems,
        address: selectedAddress,
        totalAmount: grandTotal,
        subtotal: cartSubtotal,
        deliveryFee: deliveryCalculations.deliveryCharge,
        platformFee: feeConfig.platformFee,
        paymentMethod,
        status: "pending",
        createdAt: serverTimestamp(),
      };

      // 4. CUSTOMER HISTORY
      const userOrderHistoryPayload = {
        orderId,
        total: grandTotal,
        subtotal: cartSubtotal,
        deliveryFee: deliveryCalculations.deliveryCharge,
        platformFee: feeConfig.platformFee,
        payment: paymentMethod,
        items: orderItems,
        address: selectedAddress,
        status: "pending",
        createdAt: serverTimestamp(),
      };

      // Step-by-step write with individual error diagnostics
      await setDoc(doc(db, "order_status", orderId), orderStatusPayload);
      await setDoc(doc(db, "delivery_partner_orders", orderId), deliveryPartnerPayload);
      await setDoc(doc(db, "orders", orderId), masterOrderPayload);

      try {
        await setDoc(
          doc(db, "website_users", currentUser.uid, "order_history", orderId),
          userOrderHistoryPayload
        );
      } catch (historyErr) {
        console.warn("Could not save to user order history subcollection (check rules):", historyErr);
      }

      localStorage.removeItem("fastever_cart");
      setCart([]);
      setOrderSuccess(true);
    } catch (e: any) {
      console.error("Order error:", e);
      alert(`Failed to place order: ${e?.message || "Please check database permissions"}`);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFC400]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-black/20 border-t-black" />
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <main className="min-h-screen bg-[#f7f7f7] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white border-2 border-[#FFC700] p-8 text-center shadow-xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#FFC700] text-3xl shadow-inner mb-4">
            🎉
          </div>
          <h1 className="text-2xl font-black text-black">Order Placed!</h1>
          <p className="mt-2 text-xs font-semibold text-black/60 leading-5">
            Your order has been recorded and broadcasted to delivery riders.
          </p>
          <button
            type="button"
            onClick={() => router.push("/hub")}
            className="mt-6 w-full rounded-2xl bg-[#FFC700] py-3.5 text-xs font-black uppercase text-black shadow hover:bg-black hover:text-[#FFC700] transition"
          >
            Back to HUB →
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] text-[#111] pb-24 antialiased">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-[#e5b300] bg-[#FFC700] shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/hub" className="flex items-center gap-2 font-black text-sm text-black">
            ← Continue Shopping
          </Link>
          <img src="/logo.png" alt="FASTever" className="h-9 w-auto object-contain drop-shadow" />
          <div className="w-12"></div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-black sm:text-3xl text-black mb-6">
          Review Order & Checkout
        </h1>

        {cart.length === 0 ? (
          <div className="rounded-3xl bg-white border border-black/10 p-10 text-center shadow-sm">
            <div className="text-5xl mb-3">🛒</div>
            <h2 className="text-lg font-black">Your cart is empty</h2>
            <p className="text-xs text-black/50 mt-1">Explore our HUB to add products</p>
            <Link
              href="/hub"
              className="mt-5 inline-block rounded-xl bg-[#FFC700] px-6 py-3 text-xs font-black text-black shadow hover:bg-black hover:text-[#FFC700] transition"
            >
              Go to HUB
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* LEFT COLUMN: ADDRESS & ITEMS */}
            <div className="space-y-6 lg:col-span-7">
              {/* ADDRESS CARD */}
              <div className="rounded-3xl border border-[#FFC700]/50 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-black/10 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    <h2 className="text-sm font-black uppercase tracking-wider text-black">
                      Delivery Location
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowManageModal(true)}
                    className="text-xs font-black text-black underline hover:text-[#b88c00]"
                  >
                    {selectedAddress ? "Change" : "Select Address"}
                  </button>
                </div>

                {loadingAddresses ? (
                  <p className="text-xs text-black/40">Loading addresses...</p>
                ) : selectedAddress ? (
                  <div className="rounded-2xl bg-[#FFFDF0] border border-[#FFC700]/60 p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="rounded-lg bg-black px-2.5 py-0.5 text-[10px] font-black uppercase text-[#FFC700]">
                        {selectedAddress.category}
                      </span>
                      <span className="text-xs font-bold text-black/50">
                        {deliveryCalculations.distanceKm} km away
                      </span>
                    </div>
                    <p className="text-sm font-black text-black mt-2">
                      {selectedAddress.recipient_name}{" "}
                      <span className="text-xs font-semibold text-black/60">
                        ({selectedAddress.phone})
                      </span>
                    </p>
                    <p className="text-xs leading-5 text-black/75 mt-0.5">
                      {selectedAddress.full_display_address}
                    </p>

                    {!deliveryCalculations.isDeliverable && (
                      <div className="mt-3 rounded-xl bg-red-100 p-2.5 text-xs font-bold text-red-700">
                        ⚠️ Location is beyond our delivery radius ({feeConfig.maxDistance} km).
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-xs text-black/60 font-semibold mb-3">
                      No delivery location selected yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setMapStep("map");
                        setShowMapFlow(true);
                      }}
                      className="rounded-xl bg-[#FFC700] px-5 py-2.5 text-xs font-black uppercase text-black hover:bg-black hover:text-[#FFC700] transition shadow"
                    >
                      📍 Select on Map
                    </button>
                  </div>
                )}
              </div>

              {/* CART ITEMS */}
              <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-black uppercase tracking-wider text-black border-b border-black/10 pb-3">
                  Items In Cart ({cart.length})
                </h2>

                <div className="space-y-3">
                  {cart.map((item) => {
                    const price =
                      item.product.offerPrice !== undefined &&
                      item.product.offerPrice < item.product.price
                        ? item.product.offerPrice
                        : item.product.price;

                    const reachedStock =
                      item.product.stock !== undefined &&
                      item.quantity >= item.product.stock;

                    return (
                      <div
                        key={item.product.id}
                        className="flex items-center gap-3 rounded-2xl border border-black/5 bg-[#fafafa] p-3"
                      >
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white border border-black/5 flex items-center justify-center">
                          {item.product.imageUrl ? (
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            <span>🛍️</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-xs sm:text-sm font-black text-black truncate">
                            {item.product.name}
                          </h3>
                          <p className="text-xs font-black text-black/80 mt-0.5">
                            ₹{price}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => decreaseQuantity(item.product.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-black text-sm font-black text-[#FFC700]"
                          >
                            −
                          </button>
                          <span className="min-w-[20px] text-center text-xs font-black">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={reachedStock}
                            onClick={() => increaseQuantity(item.product.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFC700] text-sm font-black text-black disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right min-w-[60px]">
                          <p className="text-xs font-black text-black">
                            ₹{price * item.quantity}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-[10px] font-bold text-red-500 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: PAYMENT & BILL BREAKDOWN */}
            <div className="lg:col-span-5 space-y-6">
              {/* PAYMENT METHOD SELECTOR */}
              <div className="rounded-3xl border-2 border-[#FFC700] bg-white p-5 shadow-sm space-y-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-black border-b border-black/10 pb-2">
                  Payment Method
                </h2>

                <div className="grid grid-cols-2 gap-2">
                  {/* COD BUTTON */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("COD")}
                    className={`rounded-2xl p-3.5 border-2 text-left transition flex flex-col justify-between ${
                      paymentMethod === "COD"
                        ? "border-black bg-black text-[#FFC700] shadow-md"
                        : "border-black/10 bg-[#fafafa] text-black hover:border-black/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">💵</span>
                      {paymentMethod === "COD" && (
                        <span className="text-xs font-black">✓ Active</span>
                      )}
                    </div>
                    <div className="mt-2">
                      <p className="text-xs font-black">Cash on Delivery</p>
                      <p className="text-[10px] opacity-75">Pay at Doorstep</p>
                    </div>
                  </button>

                  {/* UPI BUTTON (COMING SOON) */}
                  <button
                    type="button"
                    onClick={() => alert("Online UPI payment is coming soon! Please use Cash on Delivery for this order.")}
                    className="relative rounded-2xl p-3.5 border-2 border-black/10 bg-[#fafafa] text-left opacity-75 hover:opacity-100 transition flex flex-col justify-between cursor-pointer"
                  >
                    <span className="absolute top-2 right-2 rounded-md bg-orange-600 text-white px-1.5 py-0.5 text-[8px] font-black uppercase">
                      Coming Soon
                    </span>
                    <span className="text-lg">📱</span>
                    <div className="mt-2">
                      <p className="text-xs font-black text-black">Instant UPI</p>
                      <p className="text-[10px] text-black/60">GPay / PhonePe / Paytm</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* BILL DETAILS */}
              <div className="sticky top-20 rounded-3xl border-2 border-[#FFC700] bg-white p-6 shadow-xl space-y-5">
                <h2 className="text-base font-black text-black border-b border-black/10 pb-3">
                  Bill Summary
                </h2>

                <div className="space-y-3 text-xs font-bold text-black/70">
                  <div className="flex justify-between">
                    <span>Items Total</span>
                    <span className="font-black text-black">₹{cartSubtotal}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <span>Delivery Fee</span>
                      {selectedAddress && (
                        <p className="text-[10px] font-normal text-black/40">
                          {deliveryCalculations.distanceKm} km (Base {feeConfig.baseKm}km: ₹{feeConfig.baseFee} + ₹{feeConfig.perKmFee}/km)
                        </p>
                      )}
                    </div>
                    <span className="font-black text-black">
                      ₹{deliveryCalculations.deliveryCharge}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Platform Fee</span>
                    <span className="font-black text-black">₹{feeConfig.platformFee}</span>
                  </div>

                  <div className="border-t border-black/10 pt-3 flex justify-between text-sm font-black text-black">
                    <span>Grand Total</span>
                    <span className="text-lg text-black">₹{grandTotal}</span>
                  </div>
                </div>

                <div className="rounded-xl bg-[#FFFDF0] p-3 text-[11px] font-semibold text-black/70 border border-[#FFC700]/50">
                  💵 <strong>Selected Mode:</strong> Cash on Delivery (Pay cash or direct UPI to the rider upon delivery).
                </div>

                <button
                  type="button"
                  disabled={
                    isPlacingOrder ||
                    cart.length === 0 ||
                    !selectedAddress ||
                    !deliveryCalculations.isDeliverable
                  }
                  onClick={handlePlaceOrder}
                  className="w-full rounded-2xl bg-[#FFC700] py-4 text-xs sm:text-sm font-black uppercase tracking-wider text-black shadow-lg transition hover:bg-black hover:text-[#FFC700] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isPlacingOrder
                    ? "PLACING ORDER..."
                    : !selectedAddress
                    ? "SELECT ADDRESS FIRST"
                    : !deliveryCalculations.isDeliverable
                    ? "OUT OF DELIVERY RADIUS"
                    : "PLACE ORDER (COD) →"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================
          MODAL 1: SAVED ADDRESSES (MAX 3)
      ========================================================= */}

      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-black/10">
            <div className="flex items-center justify-between border-b border-black/10 bg-[#FFC700] px-5 py-4">
              <h2 className="text-sm font-black uppercase text-black">
                My Addresses ({addresses.length}/3)
              </h2>
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 font-black hover:bg-black hover:text-[#FFC700]"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-5 space-y-3">
              {addresses.length === 0 ? (
                <p className="text-center text-xs text-black/50 py-6">
                  No saved addresses found.
                </p>
              ) : (
                addresses.map((addr) => {
                  const isSelected = selectedAddress?.id === addr.id;
                  return (
                    <div
                      key={addr.id}
                      className={`flex items-start justify-between rounded-2xl border p-4 transition ${
                        isSelected
                          ? "border-2 border-[#FFC700] bg-[#FFFDF0]"
                          : "border-black/10 bg-white"
                      }`}
                    >
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          setSelectedAddress(addr);
                          setShowManageModal(false);
                        }}
                      >
                        <span className="rounded-md bg-black px-2 py-0.5 text-[9px] font-black uppercase text-[#FFC700]">
                          {addr.category}
                        </span>
                        <p className="mt-1 text-xs font-black text-black">
                          {addr.recipient_name}{" "}
                          <span className="font-semibold text-black/60">
                            ({addr.phone})
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-black/70">
                          {addr.full_display_address}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => addr.id && handleDeleteAddress(addr.id)}
                        className="ml-3 text-red-500 hover:text-red-700 p-1"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-black/10">
              {addresses.length < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowManageModal(false);
                    setMapStep("map");
                    setShowMapFlow(true);
                  }}
                  className="w-full rounded-2xl bg-[#FFC700] py-3.5 text-xs font-black uppercase text-black hover:bg-black hover:text-[#FFC700] transition"
                >
                  + Add New Address via Map
                </button>
              ) : (
                <p className="text-center text-[11px] font-bold text-orange-800">
                  Maximum 3 addresses saved. Delete one to add a new address.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 2: INTERACTIVE GOOGLE MAP + FALLBACK SUPPORT
      ========================================================= */}

      {showMapFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-5 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-black/15 flex flex-col max-h-[92vh]">
            {/* TOP BAR */}
            <div className="flex items-center justify-between border-b border-black/10 bg-[#FFC700] px-5 py-3.5 z-10">
              <h2 className="text-sm font-black uppercase text-black">
                {mapStep === "map" ? "Pin Delivery Location" : "Enter Address Details"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowMapFlow(false);
                  setMapStep("map");
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 font-black hover:bg-black hover:text-[#FFC700]"
              >
                ✕
              </button>
            </div>

            {/* STEP 1: INTERACTIVE MAP OR GEOLOCATION FALLBACK */}
            {mapStep === "map" ? (
              <div className="relative flex-1 flex flex-col min-h-[420px]">
                {!mapApiFailed && (
                  <div className="absolute top-3 inset-x-3 z-10">
                    <div className="flex items-center rounded-2xl bg-white px-3 py-2 shadow-lg border border-black/15">
                      <span className="text-base mr-2">🔍</span>
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search for area, street, or landmark..."
                        className="w-full text-xs font-bold text-black outline-none"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={panToCurrentGps}
                  className="absolute bottom-28 right-4 z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-xl border border-black/10 hover:bg-[#FFFDF0] transition active:scale-95"
                  title="Detect My Location"
                >
                  🎯
                </button>

                {!mapApiFailed ? (
                  <>
                    <div ref={mapContainerRef} className="w-full h-full flex-1" />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="relative -top-6 flex flex-col items-center">
                        <span className="text-4xl drop-shadow-md">📍</span>
                        <div className="h-2 w-2 rounded-full bg-black/40 blur-[1px]"></div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-6 flex-1 flex flex-col items-center justify-center text-center bg-[#FFFDF0]">
                    <span className="text-5xl mb-3">📍</span>
                    <h3 className="text-base font-black text-black">
                      GPS Location Mode
                    </h3>
                    <p className="text-xs text-black/70 max-w-sm mt-1 leading-5">
                      Click the button below to automatically detect your accurate coordinates from your device, or confirm this location to proceed.
                    </p>
                    <button
                      type="button"
                      onClick={panToCurrentGps}
                      className="mt-4 rounded-xl bg-black text-[#FFC700] px-5 py-2.5 text-xs font-black uppercase tracking-wider"
                    >
                      🎯 Use My Current GPS Location
                    </button>
                    <p className="mt-3 text-[11px] font-mono text-black/50">
                      Coordinates: {mapCenterCoords.lat.toFixed(6)}, {mapCenterCoords.lng.toFixed(6)}
                    </p>
                  </div>
                )}

                <div className="bg-white border-t border-black/10 p-4 shadow-xl">
                  <div className="flex items-start gap-2.5 mb-3">
                    <span className="text-lg">🏡</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-black truncate">
                        {mapGeocodedAddress}
                      </p>
                      <p
                        className={`text-[10px] font-black uppercase tracking-wider mt-0.5 ${
                          isMapServiceable ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {isMapServiceable
                          ? `✓ Delivery Available (${mapDistance} km away)`
                          : `✕ Outside Service Area (${mapDistance} km > ${feeConfig.maxDistance} km)`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!isMapServiceable}
                    onClick={handleConfirmMapLocation}
                    className="w-full rounded-2xl bg-[#FFC700] py-3.5 text-xs font-black uppercase tracking-wider text-black shadow hover:bg-black hover:text-[#FFC700] disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {isMapServiceable ? "Confirm Location →" : "Area Not Deliverable"}
                  </button>
                </div>
              </div>
            ) : (
              /* STEP 2: ADDRESS DETAILS FORM */
              <div className="overflow-y-auto p-5 space-y-4">
                <div className="rounded-2xl bg-[#FFFDF0] border border-[#FFC700]/60 p-3 flex items-start gap-2">
                  <span className="text-base">📍</span>
                  <p className="text-xs font-semibold text-black/80 line-clamp-2">
                    {streetArea}
                  </p>
                </div>

                {formError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
                    {formError}
                  </div>
                )}

                <form onSubmit={handleSaveAddressDetails} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-black uppercase text-black/60 block mb-1">
                      Save As
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["Home", "Office", "Other"] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategory(cat)}
                          className={`rounded-xl py-2 text-xs font-black border transition ${
                            category === cat
                              ? "border-black bg-black text-[#FFC700]"
                              : "border-black/10 bg-[#fafafa] text-black"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase text-black/60 block mb-1">
                      Recipient Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g. Hamid"
                      className="w-full rounded-xl border border-black/15 px-3 py-2.5 text-xs font-bold outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase text-black/60 block mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={currentUser?.phoneNumber || "10-digit number"}
                      className="w-full rounded-xl border border-black/15 px-3 py-2.5 text-xs font-bold outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase text-black/60 block mb-1">
                      House / Flat / Building No. *
                    </label>
                    <input
                      type="text"
                      required
                      value={houseNo}
                      onChange={(e) => setHouseNo(e.target.value)}
                      placeholder="Building name, Floor, Flat No"
                      className="w-full rounded-xl border border-black/15 px-3 py-2.5 text-xs font-bold outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase text-black/60 block mb-1">
                      Street / Area / Locality *
                    </label>
                    <input
                      type="text"
                      required
                      value={streetArea}
                      onChange={(e) => setStreetArea(e.target.value)}
                      placeholder="Main Road, Konni"
                      className="w-full rounded-xl border border-black/15 px-3 py-2.5 text-xs font-bold outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase text-black/60 block mb-1">
                      Nearby Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Near Petrol Pump"
                      className="w-full rounded-xl border border-black/15 px-3 py-2.5 text-xs font-bold outline-none focus:border-black"
                    />
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMapStep("map")}
                      className="flex-1 rounded-xl bg-black/5 py-3 text-xs font-black text-black"
                    >
                      ← Back to Location
                    </button>
                    <button
                      type="submit"
                      disabled={savingAddress}
                      className="flex-1 rounded-xl bg-[#FFC700] py-3 text-xs font-black uppercase text-black hover:bg-black hover:text-[#FFC700] transition disabled:opacity-50"
                    >
                      {savingAddress ? "Saving..." : "Save Address"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}