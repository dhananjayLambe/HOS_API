"use client";

import { useEffect, useState } from "react";
import { Heart, Activity, Users, Calendar } from "lucide-react";

const HeroAnimation = () => {
  const [currentIcon, setCurrentIcon] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  
  const icons = [
    <Heart className="h-12 w-12 text-purple-500" key="heart" />,
    <Activity className="h-12 w-12 text-violet-500" key="activity" />,
    <Users className="h-12 w-12 text-purple-600" key="users" />,
    <Calendar className="h-12 w-12 text-purple-400" key="calendar" />
  ];

  useEffect(() => {
    setIsMounted(true);
    const interval = setInterval(() => {
      setCurrentIcon((prev) => (prev + 1) % icons.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [icons.length]);

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center mb-8">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-violet-500/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="transition-all duration-500 ease-in-out transform hover:scale-110">
              {icons[0]}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center mb-8">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-violet-500/20 rounded-full blur-2xl animate-pulse"></div>
        <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="transition-all duration-500 ease-in-out transform hover:scale-110">
            {icons[currentIcon]}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroAnimation;
