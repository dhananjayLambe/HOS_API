"use client";

import { useEffect, useState } from "react";

const BackgroundTest = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 z-50 p-3 bg-red-500 text-white rounded-lg shadow-lg">
      <div className="text-sm font-bold">Background Test</div>
      <div className="text-xs">If you see this, white background should be visible</div>
    </div>
  );
};

export default BackgroundTest;
