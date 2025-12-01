import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Heart, Share2, ShoppingCart, Star, Plus, Minus, ChevronLeft, ChevronRight, Check, Truck, Shield, PackageCheck, Sparkles, Award, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { useCart } from "@/contexts/CartContext";

const ProductDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState("Chicken & Rice");
  const [selectedSize, setSelectedSize] = useState("2.5kg");
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Get product from location state or use default
  const product = location.state?.product || {
    name: "Premium Dog Food",
    subtitle: "Better health. Better taste. Happier pets.",
    price: "₪207.84",
    originalPrice: "₪259.80",
    discount: "20% OFF",
    image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&h=600&fit=crop",
    color: "bg-[#B8E3D5]",
    category: "intop-ribet",
    description: "High-quality premium dog food made with natural ingredients. Perfect for all breeds and life stages. Contains essential vitamins, minerals, and proteins for optimal health.",
    rating: 4.8,
    reviewCount: 234,
  };

  const benefits = [
    { icon: Sparkles, title: "Great for sensitive pets", description: "Gentle on stomach, easy to digest" },
    { icon: Award, title: "Premium quality", description: "Fair price, exceptional ingredients" },
    { icon: Truck, title: "Fresh delivery", description: "Delivered fresh to your home" },
    { icon: Shield, title: "Vet-approved", description: "Trusted by veterinarians" },
    { icon: Heart, title: "Boosts happiness", description: "Energy & joy in every bite" },
  ];

  const relatedProducts = [
    { id: 1, name: "Dog Treats", price: "₪45.00", image: "https://images.unsplash.com/photo-1615751072497-5f5169febe17?w=300&h=300&fit=crop" },
    { id: 2, name: "Pet Vitamins", price: "₪89.00", image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=300&h=300&fit=crop" },
    { id: 3, name: "Dog Toy Set", price: "₪65.00", image: "https://images.unsplash.com/photo-1591769225440-811ad7d6eab3?w=300&h=300&fit=crop" },
    { id: 4, name: "Pet Bowl", price: "₪55.00", image: "https://images.unsplash.com/photo-1585664811087-47f65abbad64?w=300&h=300&fit=crop" },
  ];

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
      petImage: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=300&h=300&fit=crop",
    },
    {
      id: 2,
      author: "John D.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
      rating: 4,
      date: "1 month ago",
      comment: "Great value for money. My pet has been healthier since switching to this product. Highly recommend!",
      petImage: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300&h=300&fit=crop",
    },
    {
      id: 3,
      author: "Emily R.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
      rating: 5,
      date: "1 month ago",
      comment: "Best purchase I've made for my pet. The ingredients are natural and my dog's energy levels have improved.",
      petImage: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=300&h=300&fit=crop",
    },
  ];

  const handleAddToCart = () => {
    const priceNumeric = parseFloat(product.price.replace('₪', ''));
    addToCart({
      id: `${product.name}-${selectedVariant}-${selectedSize}`,
      name: product.name,
      price: priceNumeric,
      image: product.image,
      quantity: quantity,
      variant: selectedVariant,
      size: selectedSize,
    });
    toast({
      title: "Added to cart",
      description: `${product.name} x${quantity} added successfully`,
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate("/cart");
  };

  const toggleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    toast({
      title: isWishlisted ? "Removed from wishlist" : "Added to wishlist",
      description: isWishlisted ? `${product.name} removed` : `${product.name} saved for later`,
    });
  };

  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="min-h-screen pb-32 bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-gray-100"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Button>
          <h1 className="text-base font-bold font-jakarta text-gray-900">Product Details</h1>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full hover:bg-gray-100"
              onClick={() => toast({ title: "Share", description: "Product link copied!" })}
            >
              <Share2 className="w-4 h-4 text-gray-700" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className={`rounded-full hover:bg-gray-100 ${isWishlisted ? 'text-red-500' : 'text-gray-700'}`}
              onClick={toggleWishlist}
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* Product Images Gallery */}
      <div className="bg-gradient-to-br from-[#B8E3D5] to-[#A5D8C8] relative">
        <div className="aspect-square max-w-2xl mx-auto relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img
              key={selectedImage}
              src={images[selectedImage]}
              alt={product.name}
              className="w-full h-full object-cover"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            />
          </AnimatePresence>
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
              >
                <ChevronLeft className="w-5 h-5 text-gray-900" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
              >
                <ChevronRight className="w-5 h-5 text-gray-900" />
              </button>
            </>
          )}
        </div>
        {/* Image Thumbnails */}
        <div className="flex gap-2 justify-center py-3 px-4">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedImage(idx)}
              className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                selectedImage === idx
                  ? "border-gray-900 scale-110 shadow-md"
                  : "border-white/50 opacity-60 hover:opacity-80"
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
        
        {/* Trust Badges */}
        <div className="flex justify-center gap-3 pb-4 px-4">
          <Badge className="bg-white/90 text-gray-800 border-none shadow-sm font-jakarta text-xs">
            <Check className="w-3 h-3 mr-1" />
            Pet Owner Recommended
          </Badge>
          <Badge className="bg-white/90 text-gray-800 border-none shadow-sm font-jakarta text-xs">
            <Shield className="w-3 h-3 mr-1" />
            100% Secure
          </Badge>
        </div>
      </div>

      {/* Product Info */}
      <div className="px-4 py-5 space-y-5">
        {/* Title & Price */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-2xl font-bold mb-1 text-gray-900 font-jakarta leading-tight">{product.name}</h1>
          <p className="text-sm text-gray-600 mb-3 font-jakarta">{product.subtitle}</p>
          
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl font-bold text-gray-900 font-jakarta">{product.price}</span>
            {product.originalPrice && (
              <>
                <span className="text-lg text-gray-400 line-through font-jakarta">{product.originalPrice}</span>
                <Badge className="bg-accent text-gray-900 hover:bg-accent font-jakarta text-xs">
                  {product.discount}
                </Badge>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm mb-3">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(product.rating)
                      ? "fill-warning text-warning"
                      : "fill-gray-200 text-gray-200"
                  }`}
                />
              ))}
              <span className="font-semibold text-gray-900 ml-1 font-jakarta">{product.rating}</span>
              <span className="text-gray-600 font-jakarta">({product.reviewCount})</span>
            </div>
          </div>

          <p className="text-xs text-gray-600 font-jakarta flex items-center gap-1">
            <Truck className="w-3 h-3" />
            Fast delivery across Israel 🐾
          </p>
        </motion.div>

        {/* Variant Selectors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <div>
            <label className="text-sm font-semibold mb-2 block text-gray-900 font-jakarta">Flavor</label>
            <div className="flex gap-2 flex-wrap">
              {["Chicken & Rice", "Beef & Vegetables", "Salmon & Sweet Potato"].map((variant) => (
                <button
                  key={variant}
                  onClick={() => setSelectedVariant(variant)}
                  className={`px-4 py-2 rounded-lg text-sm font-jakarta transition-all ${
                    selectedVariant === variant
                      ? "bg-secondary text-gray-900 font-semibold shadow-md"
                      : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {variant}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold mb-2 block text-gray-900 font-jakarta">Size</label>
            <div className="flex gap-2">
              {["1kg", "2.5kg", "5kg", "10kg"].map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2 rounded-lg text-sm font-jakarta transition-all ${
                    selectedSize === size
                      ? "bg-secondary text-gray-900 font-semibold shadow-md"
                      : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <Separator />

        {/* Key Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-lg font-bold mb-3 text-gray-900 font-jakarta">Why Your Pet Will Love It</h3>
          <div className="space-y-3">
            {benefits.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm font-jakarta">{benefit.title}</h4>
                    <p className="text-xs text-gray-600 font-jakarta">{benefit.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <Separator />

        {/* Product Details Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-lg font-bold mb-3 text-gray-900 font-jakarta">Product Details</h3>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="description" className="border-gray-200">
              <AccordionTrigger className="font-jakarta text-sm font-semibold text-gray-900 hover:no-underline">
                Full Description
              </AccordionTrigger>
              <AccordionContent className="text-sm text-gray-600 font-jakarta leading-relaxed">
                {product.description}
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="ingredients" className="border-gray-200">
              <AccordionTrigger className="font-jakarta text-sm font-semibold text-gray-900 hover:no-underline">
                Ingredients & Nutrition
              </AccordionTrigger>
              <AccordionContent className="text-sm text-gray-600 font-jakarta space-y-2">
                <p><strong>Main Ingredients:</strong> Chicken (30%), Rice (25%), Vegetables (15%), Essential Vitamins & Minerals</p>
                <p><strong>Nutritional Value:</strong> Protein 28%, Fat 15%, Fiber 3%, Moisture 10%</p>
                <p><strong>No:</strong> Artificial preservatives, colors, or flavors</p>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="usage" className="border-gray-200">
              <AccordionTrigger className="font-jakarta text-sm font-semibold text-gray-900 hover:no-underline">
                Usage Instructions
              </AccordionTrigger>
              <AccordionContent className="text-sm text-gray-600 font-jakarta space-y-2">
                <p>Feed according to your pet's weight:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Small dogs (up to 10kg): 100-150g per day</li>
                  <li>Medium dogs (10-25kg): 150-300g per day</li>
                  <li>Large dogs (25kg+): 300-500g per day</li>
                </ul>
                <p className="mt-2">Always provide fresh water. Adjust portions based on activity level.</p>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="suitability" className="border-gray-200">
              <AccordionTrigger className="font-jakarta text-sm font-semibold text-gray-900 hover:no-underline">
                Pet Suitability
              </AccordionTrigger>
              <AccordionContent className="text-sm text-gray-600 font-jakarta">
                <p>Suitable for all dog breeds and life stages (puppies, adults, seniors).</p>
                <p className="mt-2">Especially recommended for pets with sensitive stomachs or allergies.</p>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="shipping" className="border-gray-200">
              <AccordionTrigger className="font-jakarta text-sm font-semibold text-gray-900 hover:no-underline">
                Shipping & Returns
              </AccordionTrigger>
              <AccordionContent className="text-sm text-gray-600 font-jakarta space-y-2">
                <p><strong>Shipping:</strong> Free delivery on orders over ₪199. Standard delivery 2-4 business days.</p>
                <p><strong>Returns:</strong> 30-day money-back guarantee. Contact us for easy returns.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>

        <Separator />


        {/* Reviews Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 font-jakarta">Happy Pet Parents</h3>
            <div className="flex items-center gap-1 text-sm">
              <Star className="w-4 h-4 fill-[#FBD66A] text-[#FBD66A]" />
              <span className="font-bold text-gray-900 font-jakarta">{product.rating}/5</span>
              <span className="text-gray-600 font-jakarta">({product.reviewCount})</span>
            </div>
          </div>
          <div className="space-y-3">
            {reviews.map((review) => (
              <Card key={review.id} className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 ring-2 ring-[#7DD3C0]/30">
                    <AvatarImage src={review.avatar} />
                    <AvatarFallback className="bg-[#7DD3C0] text-gray-900">{review.author[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-gray-900 font-jakarta text-sm">{review.author}</span>
                      <span className="text-xs text-gray-500 font-jakarta">{review.date}</span>
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
                    {review.petImage && (
                      <img 
                        src={review.petImage} 
                        alt="Pet" 
                        className="mt-2 w-20 h-20 rounded-lg object-cover"
                      />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>

        <Separator />

        {/* Recommended Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h3 className="text-lg font-bold mb-3 text-gray-900 font-jakarta">Customers Also Bought</h3>
          <div className="grid grid-cols-2 gap-3">
            {relatedProducts.map((item) => (
              <Card 
                key={item.id} 
                className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-gray-100 rounded-lg mb-2 overflow-hidden">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <h4 className="font-semibold text-sm text-gray-900 font-jakarta mb-1">{item.name}</h4>
                <p className="text-sm font-bold text-gray-900 font-jakarta">{item.price}</p>
              </Card>
            ))}
          </div>
        </motion.div>

        <Separator />

        {/* Trust Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-gradient-to-r from-[#B8E3D5]/20 to-[#FBD66A]/20 rounded-xl p-4"
        >
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-2">
                <Shield className="w-6 h-6 text-[#7DD3C0]" />
              </div>
              <p className="text-xs font-semibold text-gray-900 font-jakarta">Secure Payment</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-2">
                <Truck className="w-6 h-6 text-[#F4C542]" />
              </div>
              <p className="text-xs font-semibold text-gray-900 font-jakarta">Fast Delivery</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-2">
                <PackageCheck className="w-6 h-6 text-[#7DD3C0]" />
              </div>
              <p className="text-xs font-semibold text-gray-900 font-jakarta">Easy Returns</p>
            </div>
          </div>
          <div className="mt-4 text-center">
            <Badge className="bg-[#FBD66A] text-gray-900 hover:bg-[#FBD66A] font-jakarta text-xs">
              Free shipping on orders over ₪199
            </Badge>
            <p className="text-xs text-gray-600 font-jakarta mt-2">
              We care for your four-legged family members 🐶🐱
            </p>
          </div>
        </motion.div>
      </div>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-16 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-3 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-2xl mx-auto">
          {/* Quantity Selector */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-gray-700 font-jakarta">Qty:</label>
              <div className="flex items-center border border-gray-300 rounded-lg">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-8 w-8 hover:bg-gray-100"
                >
                  <Minus className="w-3 h-3 text-gray-700" />
                </Button>
                <span className="w-10 text-center text-sm font-bold text-gray-900 font-jakarta">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                  className="h-8 w-8 hover:bg-gray-100"
                >
                  <Plus className="w-3 h-3 text-gray-700" />
                </Button>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600 font-jakarta">Total</p>
              <p className="text-lg font-bold text-gray-900 font-jakarta">
                ₪{(parseFloat(product.price.replace('₪', '')) * quantity).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 border-2 border-gray-900 text-gray-900 hover:bg-gray-100 rounded-xl font-bold font-jakarta shadow-sm h-12"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
            <Button
              size="lg"
              className="flex-1 bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900 rounded-xl font-bold font-jakarta shadow-md h-12"
              onClick={handleBuyNow}
            >
              Buy Now
            </Button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProductDetail;
