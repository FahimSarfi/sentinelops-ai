import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const variants = cva("button", {
  variants: {
    variant: {
      primary: "button-primary",
      secondary: "button-secondary",
      light: "button-light",
      ghost: "button-ghost",
    },
  },
  defaultVariants: { variant: "primary" },
});
export function Button({
  className,
  variant,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof variants>) {
  return <button className={cn(variants({ variant }), className)} {...props} />;
}
export function ButtonLink({
  className,
  variant,
  ...props
}: React.ComponentProps<"a"> & VariantProps<typeof variants>) {
  return <a className={cn(variants({ variant }), className)} {...props} />;
}
