import Image, { ImageProps } from "next/image";

interface OptimizedImageProps extends Omit<ImageProps, "src"> {
  src?: string | null;
  fallbackSrc?: string;
}

export default function OptimizedImage({
  src,
  fallbackSrc = "/placeholder.svg",
  alt,
  ...props
}: OptimizedImageProps) {
  return <Image src={src?.trim() || fallbackSrc} alt={alt} {...props} />;
}
