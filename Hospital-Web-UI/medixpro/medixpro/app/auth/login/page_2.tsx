"use client";

import { useState } from "react";
import {
  Stethoscope,
  Users,
  FlaskConical,
  Shield,
  Phone,
  ArrowRight,
  Loader2,
  Heart,
} from "lucide-react";
import * as React from "react";

// Reusable UI Components
const Button = ({ className = "", variant = "default", size = "default", ...props }) => {
  const baseClasses =
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

  const variantClasses =
    {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "text-primary underline-offset-4 hover:underline",
    }[variant] || variant;

  const sizeClasses =
    {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    }[size] || size;

  const combinedClasses = `${baseClasses} ${variantClasses} ${sizeClasses} ${className}`;

  return <button className={combinedClasses} {...props} />;
};

const Card = ({ className = "", ...props }) => (
  <div className={`rounded-xl border bg-card text-card-foreground shadow ${className}`} {...props} />
);

const CardHeader = ({ className = "", ...props }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />
);

const CardTitle = ({ className = "", ...props }) => (
  <h3 className={`font-semibold leading-none tracking-tight ${className}`} {...props} />
);

const CardDescription = ({ className = "", ...props }) => (
  <p className={`text-sm text-muted-foreground ${className}`} {...props} />
);

const CardContent = ({ className = "", ...props }) => (
  <div className={`p-6 pt-0 ${className}`} {...props} />
);

const Badge = ({ className = "", variant = "default", ...props }) => {
  const variantClasses =
    {
      default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
      secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
      destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
      outline: "text-foreground",
    }[variant] || variant;

  const combinedClasses = `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantClasses} ${className}`;

  return <div className={combinedClasses} {...props} />;
};

const Input = ({ className = "", type = "text", ...props }) => (
  <input
    type={type}
    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
);

const Label = ({ className = "", ...props }) => (
  <label className={`text-sm font-medium leading-none ${className}`} {...props} />
);

export default function OTPLoginPage() {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const roles = [
    { name: "Doctor", icon: Stethoscope },
    { name: "HelpDesk", icon: Users },
    { name: "LabAdmin", icon: FlaskConical },
    { name: "SuperUser", icon: Shield },
  ];

  const handleRoleSelect = (roleName: string) => {
    setSelectedRole(roleName);
    setStep(2);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!phoneNumber || phoneNumber.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneNumber, role: selectedRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || data.message || "Failed to send OTP");
      } else {
        setStep(3);
        setSuccessMessage(data.message || "OTP sent successfully.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!otp || otp.length < 4) {
      setErrorMessage("Please enter a valid OTP.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneNumber, role: selectedRole, otp }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || data.message || "OTP verification failed");
      } else {
        setSuccessMessage(data.message || "Login successful!");
        // TODO: handle token storage or redirect
        console.log("Login success:", data);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneNumber, role: selectedRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || data.message || "Failed to resend OTP");
      } else {
        setSuccessMessage(data.message || "OTP resent successfully.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setErrorMessage("");
      setSuccessMessage("");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-lg mx-auto rounded-3xl shadow-2xl bg-white dark:bg-slate-900">
        <CardHeader>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 shadow-lg">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <span className="text-3xl font-bold text-slate-900 dark:text-white">MedixPro</span>
          </div>
          <CardTitle className="text-3xl font-bold text-center">Secure Login</CardTitle>
          <CardDescription className="text-center mt-2">
            {step === 1 && "Select your role to get started."}
            {step === 2 && `Logging in as: ${selectedRole}. Please enter your mobile number.`}
            {step === 3 && `Enter the OTP sent to your mobile number.`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 1 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <Card
                    key={role.name}
                    className={`cursor-pointer transition-all rounded-xl hover:shadow-lg hover:scale-[1.02] ${
                      selectedRole === role.name ? "border-purple-500 ring-2 ring-purple-500" : "border"
                    }`}
                    onClick={() => handleRoleSelect(role.name)}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-4">
                      <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
                        <Icon className="h-8 w-8 text-purple-600" />
                      </div>
                      <span className="mt-3 text-sm font-semibold">{role.name}</span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {(step === 2 || step === 3) && (
            <>
              <div className="flex justify-between items-center mb-6">
                <Button variant="link" size="sm" onClick={handleGoBack}>
                  &larr; Back
                </Button>
                <Badge variant="secondary">{selectedRole}</Badge>
              </div>

              <form className="space-y-6">
                {step === 2 && (
                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="e.g., 9876543210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-2">
                    <Label htmlFor="otp">One-Time Password (OTP)</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                )}

                {errorMessage && <div className="text-sm text-center text-red-500">{errorMessage}</div>}
                {successMessage && <div className="text-sm text-center text-green-600">{successMessage}</div>}

                <div className="space-y-4">
                  {step === 2 && (
                    <Button onClick={handleRequestOtp} disabled={isLoading} className="w-full">
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Get OTP"}
                    </Button>
                  )}
                  {step === 3 && (
                    <>
                      <Button onClick={handleLogin} disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Login"}
                      </Button>
                      <Button variant="link" onClick={handleResendOtp} disabled={isLoading} className="w-full text-sm">
                        Resend OTP
                      </Button>
                    </>
                  )}
                </div>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}