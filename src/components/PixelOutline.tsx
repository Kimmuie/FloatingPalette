type PixelOutlineProps = {
  as?: React.ElementType;
  className?: string;
  children?: React.ReactNode;
} & React.ComponentPropsWithoutRef<any>;

export default function PixelOutline({
    as: Component = "div",
    className = "",
    children,
    ...props
    }: PixelOutlineProps) {

  return (
    <div className="relative">
      <div className="opacity-30 bg-custom-black absolute inset-0 pointer-events-none " />

      <Component
        className={`relative ${className}`}
        {...props}
      >
        {children}
      </Component>
    </div>
  );
}