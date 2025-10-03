"use client";
import React, { useState } from 'react';

import {
  Stethoscope,
  Users,
  FlaskConical,
  Shield,
} from "lucide-react";

// Re-implementing the components with inline styles for a single-file application
const Card = ({ className = '', ...props }) => (
  <div
    className={`rounded-xl border bg-card text-card-foreground shadow-sm ${className}`}
    {...props}
  />
);

const CardHeader = ({ className = '', ...props }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />
);

const CardTitle = ({ className = '', ...props }) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`} {...props} />
);

const CardDescription = ({ className = '', ...props }) => (
  <p className={`text-sm text-muted-foreground ${className}`} {...props} />
);

const CardContent = ({ className = '', ...props }) => (
  <div className={`p-6 pt-0 ${className}`} {...props} />
);

const Badge = ({ className = '', variant = 'default', ...props }) => {
  const variantClasses =
    {
      default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
      secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
      destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
      outline: 'text-foreground',
    }[variant] || variant;

  const combinedClasses = `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantClasses} ${className}`;

  return <div className={combinedClasses} {...props} />;
};

const Button = ({ className = '', variant = 'default', ...props }) => {
  const baseClasses =
    'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

  const variantClasses =
    {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline',
    }[variant] || variant;

  const combinedClasses = `${baseClasses} h-10 px-4 py-2 ${className}`;

  return <button className={combinedClasses} {...props} />;
};

// Inline SVG icons to avoid external dependencies
const HeartIcon = (props: React.JSX.IntrinsicAttributes & React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.87 0-3.69.83-5.12 2.72L12 7.5l-1.38-1.78C9.19 3.83 7.37 3 5.5 3A5.5 5.5 0 0 0 0 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

// This is the default exported component that Next.js will render as the page.
export default function RegistrationPage() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const roles = [
    { name: 'Doctor', icon: Stethoscope, path: 'register/doctor-registration' },
    { name: 'HelpDesk', icon: Users, path: '/helpdesk-registration' },
    { name: 'LabAdmin', icon: FlaskConical, path: '/lab-registration' },
    { name: 'SuperUser', icon: Shield, path: '/superuser-registration' },
  ];

  const handleRoleSelect = (role: React.SetStateAction<null>) => {
    setSelectedRole(role);
    setIsRedirecting(true);
    // In a real application, you would use a router here.
    // For this example, we'll simulate the redirection.
    window.location.href = role.path;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-4"
      // style={{
      //   backgroundImage: 'radial-gradient(at 100% 0, rgb(233, 213, 255) 0, transparent 50%), radial-gradient(at 0 100%, rgb(254, 249, 195) 0, transparent 50%)'
      // }}
    >
      {/* Back to Home Link */}
      <a href="/"
        className="absolute top-4 left-4 md:top-8 md:left-8 z-10 text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
      >
        &larr; Back to Home
      </a>
      
      {/* Main Card Container */}
      <Card className="w-full max-w-lg mx-auto rounded-3xl overflow-hidden shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200 dark:border-slate-800">
        <CardHeader className="p-6 md:p-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 shadow-lg">
              <HeartIcon className="h-6 w-6 text-white" />
            </div>
            <span className="text-3xl font-bold text-slate-900 dark:text-white">MedixPro</span>
          </div>
          <CardTitle className="text-3xl font-bold text-center text-slate-900 dark:text-white">
            Secure Registration
          </CardTitle>
          <CardDescription className="text-center text-base text-slate-600 dark:text-slate-300 mt-2">
            Select your role to register.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 md:p-8 pt-0">
          {!isRedirecting ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <Card
                    key={role.name}
                    className={`
                      relative cursor-pointer transition-all duration-300 rounded-xl
                      hover:shadow-lg hover:scale-105 group
                      ${selectedRole && selectedRole.name === role.name
                        ? 'border-purple-500 ring-2 ring-purple-500 shadow-xl scale-105'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }
                    `}
                    onClick={() => handleRoleSelect(role)}
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
          ) : (
            <div className="text-center">
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                You have selected {selectedRole ? selectedRole.name : ""}.
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Redirecting to {selectedRole.path}...
              </p>
              <Button
                  variant="link"
                  className="mt-4 p-0"
                  onClick={() => setIsRedirecting(false)}
                >
                &larr; Go Back to Role Selection
              </Button>
            </div>
          )}
        </CardContent>
          
      </Card>
    </div>
  );
}
