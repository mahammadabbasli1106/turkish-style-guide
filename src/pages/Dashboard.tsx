import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Shirt, Sparkles, CloudSun, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const { user, loading } = useAuth();

  const { data: clothingCount = 0 } = useQuery({
    queryKey: ["clothing-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("clothing_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: outfitCount = 0 } = useQuery({
    queryKey: ["outfit-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("outfit_suggestions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count || 0;
    },
    enabled: !!user,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const stats = [
    { label: "Clothing Items", value: clothingCount, icon: Shirt, color: "bg-primary" },
    { label: "Outfits Created", value: outfitCount, icon: Sparkles, color: "bg-accent" },
    { label: "Weather Checks", value: "∞", icon: CloudSun, color: "bg-secondary" },
  ];

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Welcome back!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's your style overview
          </p>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-xl p-6 shadow-card border border-border"
            >
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon size={20} className="text-primary-foreground" />
              </div>
              <p className="font-display text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Link to="/dashboard/wardrobe">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-primary rounded-xl p-8 text-primary-foreground cursor-pointer shadow-warm"
            >
              <Shirt size={32} className="mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2">Manage Wardrobe</h3>
              <p className="text-primary-foreground/80">
                Upload and organize your clothing items
              </p>
            </motion.div>
          </Link>

          <Link to="/dashboard/suggest">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-card rounded-xl p-8 border border-border cursor-pointer shadow-card hover:shadow-card-hover transition-shadow"
            >
              <TrendingUp size={32} className="text-primary mb-4" />
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                Get Outfit Suggestion
              </h3>
              <p className="text-muted-foreground">
                Let AI pick the perfect outfit for today
              </p>
            </motion.div>
          </Link>
        </div>

        {clothingCount < 5 && (
          <div className="bg-accent/20 rounded-xl p-6 border border-accent/30">
            <h3 className="font-semibold text-foreground mb-2">🎯 Getting Started</h3>
            <p className="text-muted-foreground text-sm">
              Add at least 5 clothing items to your wardrobe to unlock AI outfit suggestions. 
              We recommend having a mix of tops, bottoms, and outerwear for the best results!
            </p>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
