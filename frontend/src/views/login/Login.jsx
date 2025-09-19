import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { postLogin } from "./js/login";
import { postSignup } from "./js/signup";
import emailjs from "@emailjs/browser";

// shadcn/ui
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { Alert, AlertDescription } from "../../components/ui/alert";

// --- env
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export default function Login() {
  const nav = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // form state
  const [formData, setFormData] = useState({
    usernameOrEmail: "",
    password: "",
    username: "",
    email: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    phone: "",
  });

  // OTP state
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);

  // countdown display for OTP
  const msLeft = Math.max(0, otpExpiresAt - Date.now());
  const secsLeft = Math.ceil(msLeft / 1000);
  const canResend = msLeft <= 0;

  useEffect(() => {
    if (PUBLIC_KEY) {
      // init once – EmailJS v4+ allows send without init if passing publicKey; this keeps it explicit.
      emailjs.init(PUBLIC_KEY);
    }
  }, []);

  const onChange = (e) => {
    setMsg({ type: "", text: "" });
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const toggleForm = () => {
    setIsLogin((v) => !v);
    setMsg({ type: "", text: "" });
    setFormData({
      usernameOrEmail: "",
      password: "",
      username: "",
      email: "",
      confirmPassword: "",
      first_name: "",
      last_name: "",
      phone: "",
    });
  };

  function generateOtp() {
    // 6-digit numeric
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function niceTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  async function sendOtpEmail(toEmail) {
    const code = generateOtp();
    const expires = Date.now() + 15 * 60 * 1000; // 15 minutes

    setSendingOtp(true);
    try {
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          email: toEmail,
          passcode: code,
          time: niceTime(expires),
        },
        { publicKey: PUBLIC_KEY }
      );

      setOtpCode(code);
      setOtpExpiresAt(expires);
      setOtpInput("");
      setOtpDialogOpen(true);
      setMsg({
        type: "ok",
        text: "We sent a 6-digit code to your email. Enter it below to continue.",
      });
    } catch (err) {
      setMsg({
        type: "error",
        text:
          err?.text ||
          err?.message ||
          "Could not send verification email. Please try again.",
      });
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    try {
      setLoading(true);

      if (isLogin) {
        if (!formData.usernameOrEmail || !formData.password) {
          setMsg({
            type: "error",
            text: "Please enter email/username and password.",
          });
          return;
        }
        const { next } = await postLogin({
          usernameOrEmail: formData.usernameOrEmail.trim(),
          password: formData.password,
        });
        nav(next);
      } else {
        // signup path
        if (
          !formData.username ||
          !formData.email ||
          !formData.password ||
          !formData.first_name ||
          !formData.last_name
        ) {
          setMsg({ type: "error", text: "Please complete all required fields." });
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setMsg({ type: "error", text: "Passwords do not match." });
          return;
        }

        // Step 1: send OTP to email using EmailJS template
        await sendOtpEmail(formData.email.trim());
      }
    } catch (err) {
      setMsg({ type: "error", text: err?.message || "Something went wrong." });
    } finally {
      setLoading(false);
    }
  }

  async function verifyAndCreate() {
    if (!otpCode) {
      setMsg({ type: "error", text: "No OTP generated. Please resend." });
      return;
    }
    if (Date.now() > otpExpiresAt) {
      setMsg({ type: "error", text: "The code has expired. Please resend." });
      return;
    }
    if (otpInput.trim() !== otpCode) {
      setMsg({ type: "error", text: "Incorrect code. Please try again." });
      return;
    }

    // Code is valid → proceed to create account
    try {
      setLoading(true);
      const { token, next } = await postSignup({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim(),
        address: null,
      });

      if (token) {
        nav(next);
      } else {
        setMsg({ type: "ok", text: "Account created! Please sign in." });
        setIsLogin(true);
        setFormData({
          usernameOrEmail: formData.email,
          password: "",
          username: "",
          email: "",
          confirmPassword: "",
          first_name: "",
          last_name: "",
          phone: "",
        });
      }
      setOtpDialogOpen(false);
    } catch (err) {
      setMsg({ type: "error", text: err?.message || "Sign up failed." });
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    if (!formData.email) return;
    await sendOtpEmail(formData.email.trim());
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center font-poppins px-4">
      <Card className="w-full max-w-md rounded-3xl shadow-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">
            {isLogin ? "Sign In" : "Create Account"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Enter your credentials to access your account"
              : "Fill in your details to get started"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {msg.text ? (
            <Alert
              className={`mb-4 ${
                msg.type === "error" ? "border-red-300" : "border-emerald-300"
              }`}
            >
              <AlertDescription
                className={msg.type === "error" ? "text-red-700" : "text-emerald-700"}
              >
                {msg.text}
              </AlertDescription>
            </Alert>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={onChange}
                    placeholder="johndoe"
                    autoComplete="username"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={onChange}
                      placeholder="John"
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={onChange}
                      placeholder="Doe"
                      autoComplete="family-name"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor={isLogin ? "usernameOrEmail" : "email"}>
                {isLogin ? "Email or Username" : "Email Address"}
              </Label>
              <Input
                id={isLogin ? "usernameOrEmail" : "email"}
                type={isLogin ? "text" : "email"}
                name={isLogin ? "usernameOrEmail" : "email"}
                value={isLogin ? formData.usernameOrEmail : formData.email}
                onChange={onChange}
                placeholder={isLogin ? "you@example.com or johndoe" : "you@example.com"}
                autoComplete="email"
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={onChange}
                  placeholder="+63 912 345 6789"
                  autoComplete="tel"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={onChange}
                placeholder="••••••••"
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={onChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            )}

            {isLogin && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="link"
                  className="px-0 text-emerald-600"
                  onClick={() =>
                    setMsg({
                      type: "ok",
                      text: "Please contact the administrator to reset your password.",
                    })
                  }
                >
                  Forgot your password?
                </Button>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || sendingOtp}
              className="w-full"
            >
              {loading || sendingOtp
                ? isLogin
                  ? "Signing in…"
                  : sendingOtp
                  ? "Sending code…"
                  : "Creating…"
                : isLogin
                ? "Sign In"
                : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-slate-600">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            </span>
            <Button variant="link" onClick={toggleForm} className="p-0">
              {isLogin ? "Sign up here!" : "Sign in here!"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* OTP Dialog */}
      <Dialog open={otpDialogOpen} onOpenChange={setOtpDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Email Verification</DialogTitle>
            <DialogDescription>
              Enter the 6-digit code we sent to <b>{formData.email || "your email"}</b>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="otp">One-Time Password (OTP)</Label>
            <Input
              id="otp"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
            />
            <p className="text-xs text-slate-500">
              {canResend
                ? "Code expired."
                : `Code expires in ${secsLeft}s (valid until ${niceTime(otpExpiresAt)}).`}
            </p>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={resendOtp}
              disabled={sendingOtp || (!canResend && !PUBLIC_KEY)}
            >
              {sendingOtp ? "Sending…" : "Resend Code"}
            </Button>
            <Button type="button" onClick={verifyAndCreate} disabled={loading}>
              Verify & Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
