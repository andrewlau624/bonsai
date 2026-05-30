// Bonsai brand mark. Uses currentColor so it inherits the accent/theme.
export function Logo({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path
        d="M46.1,-55.3C53.2,-48.9,48,-28.2,44,-13.3C40,1.6,37.3,10.8,31.8,16.7C26.4,22.5,18.2,25.2,8.6,32.4C-0.9,39.7,-12,51.5,-26.7,54.4C-41.4,57.3,-59.8,51.2,-60.3,39.9C-60.9,28.5,-43.7,11.9,-40.1,-6.8C-36.5,-25.6,-46.5,-46.5,-42.1,-53.3C-37.7,-60.2,-18.9,-52.9,0.3,-53.2C19.5,-53.6,38.9,-61.6,46.1,-55.3Z"
        transform="translate(100 100)"
      />
    </svg>
  )
}
