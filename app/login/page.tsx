"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  browserLocalPersistence,
  RecaptchaVerifier,
  setPersistence,
  signInWithPhoneNumber,
  onAuthStateChanged,
  type ConfirmationResult,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnTo = searchParams.get("returnTo") || "cart";

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");

  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/hub?openCart=true");
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {}
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  const getFormattedPhone = () => {
    let cleanPhone = phone.replace(/\D/g, "");

    if (cleanPhone.startsWith("91") && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.substring(2);
    }

    if (cleanPhone.length !== 10) {
      return null;
    }

    return `+91${cleanPhone}`;
  };

  const getOrCreateRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {}
      recaptchaVerifierRef.current = null;
    }

    const container = document.getElementById("recaptcha-container");
    if (container) {
      container.innerHTML = "";
    }

    const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => {},
      "expired-callback": () => {
        if (recaptchaVerifierRef.current) {
          try {
            recaptchaVerifierRef.current.clear();
          } catch {}
          recaptchaVerifierRef.current = null;
        }
      },
    });

    recaptchaVerifierRef.current = verifier;
    return verifier;
  };

  const sendOTP = async () => {
    setError("");

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setError("Please enter your name.");
      return;
    }

    const formattedPhone = getFormattedPhone();

    if (!formattedPhone) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!ageConfirmed) {
      setError("Please confirm that you are 18 years of age or older.");
      return;
    }

    if (!termsAccepted) {
      setError("Please accept the Terms & Conditions.");
      return;
    }

    if (!privacyAccepted) {
      setError("Please acknowledge the Privacy Policy.");
      return;
    }

    setLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);

      const verifier = getOrCreateRecaptcha();

      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        verifier
      );

      window.confirmationResult = confirmationResult;

      sessionStorage.setItem("fastever_login_phone", formattedPhone);
      sessionStorage.setItem("fastever_login_name", trimmedName);
      sessionStorage.setItem("fastever_login_age_confirmed", "true");
      sessionStorage.setItem("fastever_login_terms_accepted", "true");
      sessionStorage.setItem("fastever_login_privacy_accepted", "true");
      sessionStorage.setItem(
        "fastever_phone_verification_id",
        confirmationResult.verificationId
      );
      sessionStorage.setItem("fastever_login_return_to", returnTo);

      router.push("/login/otp");
    } catch (err: any) {
      console.error("Send OTP error:", err);

      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {}
        recaptchaVerifierRef.current = null;
      }

      if (err?.code === "auth/invalid-phone-number") {
        setError("The mobile number is invalid.");
      } else if (err?.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a while and try again.");
      } else if (err?.code === "auth/quota-exceeded") {
        setError("OTP service limit reached. Please try again later.");
      } else if (err?.code === "auth/captcha-check-failed") {
        setError("Security verification failed. Please refresh and try again.");
      } else {
        setError(err?.message || "Unable to send OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FFC400] text-[#111] flex items-center justify-center px-4 py-8 antialiased">
      <div id="recaptcha-container" />

      <div className="w-full max-w-md">
        {/* Large Logo */}
        <div className="flex justify-center mb-6">
          <Link
            href="/hub"
            className="transition hover:scale-105 active:scale-95 focus:outline-none"
          >
            <img
              src="/logo.png"
              alt="FASTever Logo"
              className="h-28 sm:h-32 w-auto object-contain drop-shadow-md"
            />
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white border-2 border-[#FFC700] rounded-3xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(255,199,0,0.18)]">
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-black">
              Welcome to FASTever
            </h1>

            <p className="text-black/60 mt-1 text-xs sm:text-sm font-semibold">
              Login or create your account to continue
            </p>
          </div>

          {/* Name Field */}
          <div className="mb-4">
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
              Your name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              autoComplete="name"
              className="w-full h-12 rounded-xl bg-white border-2 border-[#FFC700]/60 px-4 text-sm font-bold text-black placeholder:text-black/35 outline-none focus:border-black focus:ring-1 focus:ring-black transition shadow-sm"
            />
          </div>

          {/* Phone Field */}
          <div className="mb-5">
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
              Mobile number
            </label>

            <div className="flex rounded-xl border-2 border-[#FFC700]/60 bg-white overflow-hidden focus-within:border-black focus-within:ring-1 focus-within:ring-black transition shadow-sm">
              <div className="h-12 px-4 flex items-center bg-[#FFC700] text-black font-black text-sm border-r-2 border-[#FFC700]">
                +91
              </div>

              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="10-digit mobile number"
                autoComplete="tel"
                className="flex-1 h-12 bg-white px-3 text-sm font-bold text-black placeholder:text-black/35 outline-none"
              />
            </div>
          </div>

          {/* Age Confirmation */}
          <label className="flex items-start gap-3 mb-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-2 border-[#FFC700] accent-[#FFC700] cursor-pointer shrink-0"
            />
            <span className="text-xs leading-5 text-black/75">
              I confirm that I am{" "}
              <strong className="text-black font-black">
                18 years of age or older
              </strong>
              .
            </span>
          </label>

          {/* Terms */}
          <label className="flex items-start gap-3 mb-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-2 border-[#FFC700] accent-[#FFC700] cursor-pointer shrink-0"
            />
            <span className="text-xs leading-5 text-black/75">
              I agree to the{" "}
              <Link
                href="/terms"
                target="_blank"
                className="text-black font-black underline hover:text-[#b88c00]"
              >
                FASTever Terms & Conditions
              </Link>
              .
            </span>
          </label>

          {/* Privacy */}
          <label className="flex items-start gap-3 mb-5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-2 border-[#FFC700] accent-[#FFC700] cursor-pointer shrink-0"
            />
            <span className="text-xs leading-5 text-black/75">
              I acknowledge that I have read the{" "}
              <Link
                href="/privacy"
                target="_blank"
                className="text-black font-black underline hover:text-[#b88c00]"
              >
                FASTever Privacy Policy
              </Link>
              .
            </span>
          </label>

          {/* Error Display */}
          {error && (
            <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700">
              {error}
            </div>
          )}

          {/* Continue Button */}
          <button
            type="button"
            onClick={sendOTP}
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-[#FFC700] text-black font-black text-sm uppercase tracking-wider shadow-lg hover:bg-black hover:text-[#FFC700] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "SENDING OTP..." : "CONTINUE →"}
          </button>

          <p className="text-center text-[11px] font-semibold text-black/45 mt-4 leading-4">
            We will send a 6-digit verification code to your mobile number.
          </p>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link
            href="/hub"
            className="text-xs font-black text-black/60 hover:text-black transition"
          >
            ← Back to FASTever HUB
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}