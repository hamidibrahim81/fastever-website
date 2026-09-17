"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  browserLocalPersistence,
  RecaptchaVerifier,
  setPersistence,
  signInWithCredential,
  PhoneAuthProvider,
  signInWithPhoneNumber,
  onAuthStateChanged,
  updateProfile,
  type ConfirmationResult,
} from "firebase/auth";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

export default function OTPPage() {
  const router = useRouter();

  const [otp, setOtp] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [returnTo, setReturnTo] = useState("/hub");

  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  const [countdown, setCountdown] = useState(30);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const [verificationId, setVerificationId] = useState("");

  useEffect(() => {
    const storedPhone =
      sessionStorage.getItem("fastever_login_phone") || "";
    const storedName =
      sessionStorage.getItem("fastever_login_name") || "";
    const storedVerificationId =
      sessionStorage.getItem("fastever_phone_verification_id") || "";
    const storedReturnTo =
      sessionStorage.getItem("fastever_login_return_to") || "/hub";
    const storedAge =
      sessionStorage.getItem("fastever_login_age_confirmed") === "true";
    const storedTerms =
      sessionStorage.getItem("fastever_login_terms_accepted") === "true";
    const storedPrivacy =
      sessionStorage.getItem("fastever_login_privacy_accepted") === "true";

    setPhone(storedPhone);
    setName(storedName);
    setVerificationId(storedVerificationId);
    setReturnTo(
      storedReturnTo.startsWith("/") ? storedReturnTo : `/${storedReturnTo}`
    );
    setAgeConfirmed(storedAge);
    setTermsAccepted(storedTerms);
    setPrivacyAccepted(storedPrivacy);

    if (!storedPhone || !storedVerificationId) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // If user is already authenticated and no ongoing OTP flow exists
      const activeVerification = sessionStorage.getItem(
        "fastever_phone_verification_id"
      );
      if (user && !activeVerification) {
        router.replace("/hub");
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

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((current) => current - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const createRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {}
      recaptchaVerifierRef.current = null;
    }

    const container = document.getElementById("otp-recaptcha-container");
    if (container) {
      container.innerHTML = "";
    }

    try {
      const verifier = new RecaptchaVerifier(auth, "otp-recaptcha-container", {
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
    } catch (error) {
      console.error("reCAPTCHA setup error:", error);
      return null;
    }
  };

  const saveWebsiteUser = async (user: any) => {
    const userRef = doc(db, "website_users", user.uid);
    const existingSnapshot = await getDoc(userRef);

    const payload: Record<string, any> = {
      uid: user.uid,
      phoneNumber: user.phoneNumber || phone,
      name: name.trim() || user.displayName || "",

      ageConfirmed,
      ageConfirmedAt: serverTimestamp(),

      termsAccepted,
      termsAcceptedAt: serverTimestamp(),
      termsVersion: "1.0",

      privacyAccepted,
      privacyAcceptedAt: serverTimestamp(),
      privacyVersion: "1.0",

      updatedAt: serverTimestamp(),
    };

    if (!existingSnapshot.exists()) {
      payload.createdAt = serverTimestamp();
    }

    await setDoc(userRef, payload, { merge: true });
  };

  const verifyOTP = async () => {
    setError("");

    if (!verificationId) {
      setError("Verification session expired. Please request a new OTP.");
      return;
    }

    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);

      const credential = PhoneAuthProvider.credential(
        verificationId,
        otp
      );

      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      if (name.trim()) {
        try {
          await updateProfile(user, { displayName: name.trim() });
        } catch (profileErr) {
          console.warn("Could not update display name:", profileErr);
        }
      }

      await saveWebsiteUser(user);

      const targetDestination = returnTo || "/hub";

      sessionStorage.removeItem("fastever_login_phone");
      sessionStorage.removeItem("fastever_login_name");
      sessionStorage.removeItem("fastever_login_age_confirmed");
      sessionStorage.removeItem("fastever_login_terms_accepted");
      sessionStorage.removeItem("fastever_login_privacy_accepted");
      sessionStorage.removeItem("fastever_phone_verification_id");
      sessionStorage.removeItem("fastever_login_return_to");

      router.replace(targetDestination);
    } catch (err: any) {
      console.error("OTP verification error:", err);

      if (err?.code === "auth/invalid-verification-code") {
        setError("Incorrect OTP. Please check the code and try again.");
      } else if (err?.code === "auth/code-expired") {
        setError("This OTP has expired. Please request a new OTP.");
      } else if (err?.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait and try again later.");
      } else if (err?.code === "permission-denied") {
        setError("Database access denied. Check Firestore security rules.");
      } else {
        setError(err?.message || "OTP verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    if (countdown > 0 || !phone || resending) return;

    setError("");
    setResending(true);

    try {
      await setPersistence(auth, browserLocalPersistence);

      const verifier = createRecaptcha();

      if (!verifier) {
        throw new Error("Unable to initialize verification checks.");
      }

      const confirmationResult: ConfirmationResult =
        await signInWithPhoneNumber(auth, phone, verifier);

      const newVerificationId = confirmationResult.verificationId;

      setVerificationId(newVerificationId);
      sessionStorage.setItem(
        "fastever_phone_verification_id",
        newVerificationId
      );

      setCountdown(30);
      setOtp("");
    } catch (err: any) {
      console.error("Resend OTP error:", err);

      if (err?.code === "auth/too-many-requests") {
        setError("Too many OTP requests. Please wait before trying again.");
      } else {
        setError(
          err?.message || "Unable to resend OTP. Please try again."
        );
      }

      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {}
        recaptchaVerifierRef.current = null;
      }
    } finally {
      setResending(false);
    }
  };

  const maskedPhone = () => {
    if (!phone) return "";

    const clean = phone.replace(/\D/g, "");
    const baseNumber = clean.length > 10 ? clean.slice(-10) : clean;

    if (baseNumber.length !== 10) return phone;

    return `+91 ${baseNumber.slice(0, 2)}••••••${baseNumber.slice(-2)}`;
  };

  return (
    <main className="min-h-screen bg-[#FFC400] text-[#111] flex items-center justify-center px-4 py-8 antialiased">
      <div id="otp-recaptcha-container" />

      <div className="w-full max-w-md">
        {/* Large Brand Logo */}
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

        {/* Brand Card */}
        <div className="bg-white border-2 border-[#FFC700] rounded-3xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(255,199,0,0.18)]">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-black/60 hover:text-black text-xs font-black mb-5 transition flex items-center gap-1.5"
          >
            ← Change mobile number
          </button>

          <div className="text-center mb-6">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#FFC700] flex items-center justify-center mb-3 text-2xl shadow-md text-black">
              🔐
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-black">
              Verify your number
            </h1>

            <p className="text-black/60 mt-1 text-xs sm:text-sm font-semibold">
              We sent a 6-digit OTP to
            </p>

            <p className="text-black font-black mt-0.5 tracking-wider text-base">
              {maskedPhone()}
            </p>
          </div>

          {/* OTP Input */}
          <div className="mb-5">
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5 text-center">
              Enter OTP
            </label>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="••••••"
              className="w-full h-14 rounded-xl bg-white border-2 border-[#FFC700]/70 px-4 text-center text-2xl tracking-[0.5em] font-black text-black placeholder:text-black/30 outline-none focus:border-black focus:ring-1 focus:ring-black transition shadow-sm"
            />
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 text-center">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="button"
            onClick={verifyOTP}
            disabled={loading || otp.length !== 6}
            className="w-full h-14 rounded-2xl bg-[#FFC700] text-black font-black text-sm uppercase tracking-wider shadow-lg hover:bg-black hover:text-[#FFC700] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "VERIFYING..." : "VERIFY & GO TO HUB →"}
          </button>

          {/* Resend Action */}
          <div className="text-center mt-5">
            {countdown > 0 ? (
              <p className="text-xs font-bold text-black/55">
                Resend OTP in{" "}
                <span className="text-black font-black">{countdown}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={resendOTP}
                disabled={resending}
                className="text-xs font-black text-black underline hover:text-[#b88c00] disabled:opacity-50"
              >
                {resending ? "SENDING..." : "Resend OTP"}
              </button>
            )}
          </div>

          {/* Security Notice */}
          <div className="mt-6 pt-5 border-t border-[#FFC700]/30">
            <p className="text-[11px] font-medium text-black/45 text-center leading-4">
              Your mobile number is securely authenticated on this browser with Firebase.
            </p>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-center text-xs font-black text-black/60 mt-6">
          FASTever • Fast local services, shopping & delivery
        </p>
      </div>
    </main>
  );
}