type PixelOutlineProps = {
  as?: React.ElementType;
  className?: string;
} & React.ComponentPropsWithoutRef<any>;

export default function PixelOutline({
    as: Component = "div",
    className = "",
    ...props
    }: PixelOutlineProps) {

  return (
    <div className="relative">
      <div className="opacity-35 bg-custom-black absolute inset-0 pointer-events-none" />

      <Component
        className={`relative ${className}`}
        {...props}
      >
      </Component>
    </div>
  );
}