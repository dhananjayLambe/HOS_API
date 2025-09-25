"use client";
import { useLoadingStore } from "@/store/loadingStore";
import { motion } from "framer-motion";

export default function GlobalLoader() {
  const { isLoading } = useLoadingStore();

  return (
    <>
      {isLoading && (
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          exit={{ width: "0%" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed top-0 left-0 h-1.5 
            bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700
            shadow-[0_0_10px_rgba(168,85,247,0.6)]
            z-[9999]"
        />
      )}
    </>
  );
}