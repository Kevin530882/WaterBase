import { cn } from "@/lib/utils";

interface BrandWordmarkProps {
  className?: string;
  phClassName?: string;
}

export const BrandWordmark = ({ className, phClassName }: BrandWordmarkProps) => (
  <span className={cn("inline-flex items-baseline whitespace-nowrap font-bold", className)}>
    <span>Waterbase</span>
    <span className={cn("relative ml-0.5 inline-flex items-baseline", phClassName)}>
      <span className="text-[#0038A8]">P</span>
      <span className="text-[#CE1126]">H</span>
      <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[#FCD116]" />
    </span>
  </span>
);

