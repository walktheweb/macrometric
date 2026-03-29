type MaterialIconProps = {
  name: string;
  className?: string;
};

export default function MaterialIcon({ name, className = '' }: MaterialIconProps) {
  return (
    <span className={`material-symbols-rounded ${className}`.trim()} aria-hidden="true">
      {name}
    </span>
  );
}
