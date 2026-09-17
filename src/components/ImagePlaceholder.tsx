interface ImagePlaceholderProps {
  description: string;
  tone?: string;
  className?: string;
  number?: string;
}

export default function ImagePlaceholder({
  description,
  tone = "taupe",
  className = "",
  number,
}: ImagePlaceholderProps) {
  return (
    <div
      className={`image-placeholder tone-${tone} ${className}`}
      role="img"
      aria-label={description}
    >
      {number && <span className="image-number">{number} / MEIRO</span>}
      <div className="placeholder-copy">
        <span className="placeholder-label">IMAGE</span>
        <p>{description}</p>
      </div>
      <span className="image-corner" aria-hidden="true">
        ↗
      </span>
    </div>
  );
}
