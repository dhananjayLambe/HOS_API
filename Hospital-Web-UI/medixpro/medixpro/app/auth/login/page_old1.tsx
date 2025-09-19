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
  Heart
} from "lucide-react";
import * as React from "react"

// --- Local component definitions to make the file truly self-contained ---

const Button = ({ className = "", variant = "default", size = "default", ...props }) => {
  const baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
  }[variant] || variant;

  const sizeClasses = {
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
  const variantClasses = {
    default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground",
  }[variant] || variant;

  const combinedClasses = `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantClasses} ${className}`;

  return <div className={combinedClasses} {...props} />;
};


const Input = ({ className = "", type = "text", ...props }) => {
  return (
    <input
      type={type}
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
};

const Label = ({ className = "", ...props }) => (
  <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`} {...props} />
);

// --- End of local component definitions ---

export default function OTPLoginPage() {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const roles = [
    { name: "Doctor", icon: Stethoscope },
    { name: "HelpDesk", icon: Users },
    { name: "LabAdmin", icon: FlaskConical },
    { name: "SuperUser", icon: Shield },
  ];

  const handleRoleSelect = (roleName: string) => {
    setSelectedRole(roleName);
    setStep(2);
  };

  // const handleRequestOtp = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setErrorMessage("");
  //   if (!phoneNumber || phoneNumber.length < 10) {
  //     setErrorMessage("Please enter a valid 10-digit mobile number.");
  //     return;
  //   }

  //   setIsLoading(true);

  //   setTimeout(() => {
  //     setIsLoading(false);
  //     setStep(3);
  //     console.log(`[API Call]: Simulating OTP request for role '${selectedRole}' to number '${phoneNumber}'`);
  //   }, 1500);
  // };

    const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!phoneNumber || phoneNumber.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: phoneNumber,
          role: selectedRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      // ✅ OTP successfully sent
      setStep(3);
      console.log("OTP Sent:", data);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (!otp || otp.length < 4) {
      setErrorMessage("Please enter a valid OTP.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      console.log(`[API Call]: Simulating login for '${selectedRole}' with number '${phoneNumber}' and OTP '${otp}'`);
    }, 1500);
  };

  const handleResendOtp = () => {
      setErrorMessage("");
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        console.log(`[API Call]: Simulating OTP resend to number '${phoneNumber}'`);
      }, 1500);
  };

  const handleGoBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setErrorMessage("");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-lg mx-auto rounded-3xl overflow-hidden shadow-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader className="p-6 md:p-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 shadow-lg">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <span className="text-3xl font-bold text-slate-900 dark:text-white">MedixPro</span>
          </div>
          
          <CardTitle className="text-3xl font-bold text-center text-slate-900 dark:text-white">
            Secure Login
          </CardTitle>
          <CardDescription className="text-center text-base text-slate-600 dark:text-slate-300 mt-2">
            {step === 1 && "Select your role to get started."}
            {step === 2 && `Logging in as: ${selectedRole}. Please enter your mobile number.`}
            {step === 3 && `Enter the OTP sent to your mobile number.`}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 md:p-8 pt-0">
          {step === 1 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <Card
                    key={role.name}
                    className={`
                      relative cursor-pointer transition-all duration-300 rounded-xl
                      hover:shadow-lg hover:scale-[1.02] group
                      ${selectedRole === role.name
                        ? "border-purple-500 ring-2 ring-purple-500"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }
                    `}
                    onClick={() => handleRoleSelect(role.name)}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-4">
                      <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors duration-300">
                        <Icon className="h-8 w-8 text-purple-600" />
                      </div>
                      <span className="mt-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {role.name}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {(step === 2 || step === 3) && (
            <>
              <div className="flex justify-between items-center mb-6">
                <Button 
                  variant="link" 
                  size="sm" 
                  className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-0"
                  onClick={handleGoBack}
                >
                  &larr; Back
                </Button>
                <Badge
                  variant="secondary"
                  className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-semibold"
                >
                  <ArrowRight className="h-3 w-3 mr-2" />
                  {selectedRole}
                </Badge>
              </div>

              <form className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="e.g., 9876543210"
                      className="pl-9 pr-4 py-2 border-slate-200 dark:border-slate-700 rounded-xl focus-visible:ring-purple-500 transition-colors"
                      value={phoneNumber}
                      onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setPhoneNumber(e.target.value)}
                      disabled={step === 3 || isLoading}
                    />
                  </div>
                </div>

                {step === 3 && (
                  <div className="space-y-2">
                    <Label htmlFor="otp">One-Time Password (OTP)</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      className="text-center tracking-[0.5em] text-xl font-mono border-slate-200 dark:border-slate-700 rounded-xl focus-visible:ring-purple-500 transition-colors"
                      value={otp}
                      onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setOtp(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                )}

                {errorMessage && (
                  <div className="text-sm text-center text-red-500">
                    {errorMessage}
                  </div>
                )}

                <div className="space-y-4">
                  {step === 2 && (
                    <Button
                      onClick={handleRequestOtp}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg text-lg px-8 py-6 rounded-xl transition-all duration-300"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        "Get OTP"
                      )}
                    </Button>
                  )}
                  {step === 3 && (
                    <>
                      <Button
                        onClick={handleLogin}
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg text-lg px-8 py-6 rounded-xl transition-all duration-300"
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          "Login"
                        )}
                      </Button>
                      <Button
                        variant="link"
                        onClick={handleResendOtp}
                        disabled={isLoading}
                        className="w-full text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      >
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
