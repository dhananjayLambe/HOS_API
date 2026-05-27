"use client";

export type NextActionLineProps = {
  line: string;
};

export function NextActionLine({ line }: NextActionLineProps) {
  return (
    <p className="text-sm font-bold text-[#5B3FD9]">
      <span aria-hidden className="mr-1">
        →
      </span>
      {line}
    </p>
  );
}
