import { useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Heart, Share2, ShoppingCart, Star, Plus, Minus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";

const ProductDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  // Get product from location state or use default
  const product = location.state?.product || {
    name: "Premium Dog Food",
    price: "₪207.84",
    image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&h=600&fit=crop",
    color: "bg-[#B8E3D5]",
    category: "intop-ribet",
    description: "High-quality premium dog food made with natural ingredients. Perfect for all breeds and life stages. Contains essential vitamins, minerals, and proteins for optimal health.",
    rating: 4.8,
    reviewCount: 234,
  };

  const images = [
    product.image,
    "https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&h=600&fit=crop",
  ];

  const reviews = [
    {
      id: 1,
      author: "Sarah M.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      rating: 5,
      date: "2 weeks ago",
      comment: "Amazing product! My dog absolutely loves it. The quality is exceptional and I've noticed a significant improvement in his coat.",
    },
    {
      id: 2,
      author: "John D.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
      rating: 4,
      date: "1 month ago",
      comment: "Great value for money. My pet has been healthier since switching to this product. Highly recommend!",
    },
    {
      id: 3,
      author: "Emily R.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
      rating: 5,
      date: "1 month ago",
      comment: "Best purchase I've made for my pet. The ingredients are natural and my dog's energy levels have improved.",
    },
  ];

  const handleAddToCart = () => {
    toast({
      title: "Added to cart",
      description: `${product.name} x${quantity} added successfully`,
    });
  };

  const handleBuyNow = () => {
    toast({
      title: "Proceeding to checkout",
      description: "Redirecting to payment...",
    });
  };

  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="min-h-screen pb-32 bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-gray-100"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Button>
          <h1 className="text-lg font-bold font-jakarta text-gray-900">Product Details</h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full hover:bg-gray-100"
              onClick={() => toast({ title: "Share", description: "Product link copied!" })}
            >
              <Share2 className="w-5 h-5 text-gray-700" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full hover:bg-gray-100"
              onClick={() => toast({ title: "Added to wishlist" })}
            >
              <Heart className="w-5 h-5 text-gray-700" />
            </Button>
          </div>
        </div>
      </header>

      {/* Product Images Gallery */}
      <div className={`${product.color} relative`}>
        <div className="aspect-square max-w-2xl mx-auto relative overflow-hidden">
          <motion.img
            key={selectedImage}
            src={images[selectedImage]}
            alt={product.name}
            className="w-full h-full object-cover"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          />
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
              >
                <ChevronLeft className="w-5 h-5 text-gray-900" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
              >
                <ChevronRight className="w-5 h-5 text-gray-900" />
              </button>
            </>
          )}
        </div>
        {/* Image Thumbnails */}
        <div className="flex gap-2 justify-center py-4 px-4">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedImage(idx)}
              className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                selectedImage === idx
                  ? "border-gray-900 scale-110"
                  : "border-white/50 opacity-60 hover:opacity-80"
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Product Info */}
      <div className="px-6 py-6 space-y-6">
        {/* Title & Price */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold mb-2 text-gray-900 font-jakarta">{product.name}</h2>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl font-bold text-gray-900 font-jakarta">{product.price}</span>
            <Badge className="bg-[#7DD3C0] text-gray-900 hover:bg-[#7DD3C0] font-jakarta">
              In Stock
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(product.rating)
                      ? "fill-[#FBD66A] text-[#FBD66A]"
                      : "fill-gray-200 text-gray-200"
                  }`}
                />
              ))}
              <span className="font-semibold text-gray-900 ml-1 font-jakarta">{product.rating}</span>
              <span className="text-gray-600 font-jakarta">({product.reviewCount} reviews)</span>
            </div>
          </div>
        </motion.div>

        <Separator />

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl shadow-sm">
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="font-bold mb-1 text-gray-900 font-jakarta">Free Shipping</div>
                <div className="text-gray-600 text-xs font-jakarta">Over ₪99</div>
              </div>
              <div>
                <div className="font-bold mb-1 text-gray-900 font-jakarta">12 Month</div>
                <div className="text-gray-600 text-xs font-jakarta">Warranty</div>
              </div>
              <div>
                <div className="font-bold mb-1 text-gray-900 font-jakarta">30 Days</div>
                <div className="text-gray-600 text-xs font-jakarta">Returns</div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-lg font-bold mb-3 text-gray-900 font-jakarta">Product Description</h3>
          <p className="text-gray-600 leading-relaxed font-jakarta">
            {product.description}
          </p>
        </motion.div>

        <Separator />

        {/* Quantity Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <label className="text-sm font-bold mb-3 block text-gray-900 font-jakarta">Quantity</label>
          <div className="flex items-center gap-4">
            <div className="flex items-center border-2 border-gray-200 rounded-xl shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="hover:bg-gray-100"
              >
                <Minus className="w-4 h-4 text-gray-700" />
              </Button>
              <span className="w-12 text-center font-bold text-gray-900 font-jakarta">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
                className="hover:bg-gray-100"
              >
                <Plus className="w-4 h-4 text-gray-700" />
              </Button>
            </div>
            <div className="text-sm text-gray-600 font-jakarta">
              Total: <span className="font-bold text-gray-900">₪{(parseFloat(product.price.replace('₪', '')) * quantity).toFixed(2)}</span>
            </div>
          </div>
        </motion.div>

        <Separator />

        {/* Reviews Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-lg font-bold mb-4 text-gray-900 font-jakarta">Customer Reviews</h3>
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} className="p-4 bg-white border-2 border-gray-200 rounded-2xl shadow-sm">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={review.avatar} />
                    <AvatarFallback>{review.author[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-gray-900 font-jakarta">{review.author}</span>
                      <span className="text-xs text-gray-600 font-jakarta">{review.date}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < review.rating
                              ? "fill-[#FBD66A] text-[#FBD66A]"
                              : "fill-gray-200 text-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed font-jakarta">
                      {review.comment}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t-2 border-gray-200 p-4 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="flex gap-3 max-w-2xl mx-auto">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 border-2 border-gray-900 text-gray-900 hover:bg-gray-100 rounded-xl font-bold font-jakarta shadow-sm"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Add to Cart
          </Button>
          <Button
            size="lg"
            className="flex-1 bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900 rounded-xl font-bold font-jakarta shadow-md"
            onClick={handleBuyNow}
          >
            Buy Now
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProductDetail;
