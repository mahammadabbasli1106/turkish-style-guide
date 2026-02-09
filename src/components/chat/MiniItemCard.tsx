import { Link } from "react-router-dom";

type Props = {
  id: string;
  name: string;
  imageUrl: string;
};

export default function MiniItemCard({ id, name, imageUrl }: Props) {
  return (
    <Link
      to="/dashboard/wardrobe"
      className="flex-shrink-0 w-20 group"
    >
      <div className="w-20 h-20 rounded-xl overflow-hidden border border-border bg-card shadow-sm group-hover:border-primary/40 transition-colors">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-1 leading-tight line-clamp-2">
        {name}
      </p>
    </Link>
  );
}
