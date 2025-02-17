
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Product, ProductWithDistance } from "@/types/products";
import { useQuery } from "@tanstack/react-query";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";

const Products = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [userLocation, setUserLocation] = useState<{lat: number; lon: number} | null>(null);
  const { data: config } = useSiteConfig();

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        () => {
          toast({
            title: "Localização não disponível",
            description: "Ative a localização para ver produtos próximos",
            variant: "destructive",
          });
        }
      );
    }
  }, [toast]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", userLocation],
    queryFn: async () => {
      if (!userLocation) {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data as ProductWithDistance[];
      }

      const { data, error } = await supabase
        .rpc("search_products_by_location", {
          search_lat: userLocation.lat,
          search_lon: userLocation.lon,
          radius_in_meters: 5000
        });

      if (error) throw error;
      return data as ProductWithDistance[];
    },
    enabled: true,
  });

  const filteredProducts = products?.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pb-20 pt-4">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm pb-4">
          <div className="flex gap-2 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/user-products")}
              className="hover:scale-105 transition-transform text-foreground"
            >
              <User className="h-5 w-5" />
            </Button>
            <div className="relative flex-1">
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 rounded-full bg-card/50 backdrop-blur-sm border-none shadow-lg"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Search className="h-5 w-5 text-foreground" />
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if ("geolocation" in navigator) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      setUserLocation({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                      });
                    }
                  );
                }
              }}
              className="hover:scale-105 transition-transform text-foreground rounded-full shadow-lg"
            >
              <MapPin className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse bg-transparent shadow-none border-none">
                <div className="aspect-square bg-muted rounded-lg" />
                <CardContent className="p-3">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts?.map((product) => (
              <Card 
                key={product.id}
                className="cursor-pointer hover:scale-105 transition-transform shadow-none border-none overflow-hidden bg-transparent"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="aspect-square relative overflow-hidden rounded-lg">
                  <img
                    src={product.images[0] || "/placeholder.svg"}
                    alt={product.title}
                    className="object-cover w-full h-full hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 bg-primary/80 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs">
                    {product.condition}
                  </div>
                  {product.distance && (
                    <div className="absolute top-2 left-2 bg-primary/80 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {(product.distance / 1000).toFixed(1)}km
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <div className="mb-1">
                    <span className="text-lg font-bold text-foreground">
                      R$ {product.price.toFixed(2)}
                    </span>
                  </div>
                  <h3 className="font-semibold truncate mb-1 text-foreground">
                    {product.title}
                  </h3>
                  {product.location_name && (
                    <p className="text-sm truncate mt-1 text-foreground/60">
                      {product.location_name}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Products;

