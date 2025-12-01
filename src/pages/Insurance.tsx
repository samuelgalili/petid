import { useState } from "react";
import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  Check, 
  X, 
  Heart, 
  Activity, 
  Pill, 
  Syringe,
  FileText,
  Upload,
  Calendar,
  DollarSign,
  AlertCircle,
  ChevronRight,
  Award,
  Building2,
  Phone,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import BottomNav from "@/components/BottomNav";
import { AppHeader } from "@/components/AppHeader";

interface InsurancePlan {
  name: string;
  price: string;
  description: string;
  features: { name: string; included: boolean }[];
  color: string;
  popular?: boolean;
}

const Insurance = () => {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [claimFormData, setClaimFormData] = useState({
    petName: "",
    claimType: "",
    claimDate: "",
    claimAmount: "",
    description: "",
    vetName: "",
    vetContact: "",
  });

  const insurancePlans: InsurancePlan[] = [
    {
      name: "Basic",
      price: "₪99",
      description: "Essential coverage for accidents",
      color: "from-blue-400 to-blue-600",
      features: [
        { name: "Accident Coverage", included: true },
        { name: "Emergency Care", included: true },
        { name: "X-Rays & Diagnostics", included: true },
        { name: "Illness Coverage", included: false },
        { name: "Routine Care", included: false },
        { name: "Dental Care", included: false },
      ],
    },
    {
      name: "Standard",
      price: "₪199",
      description: "Comprehensive accident & illness",
      color: "from-primary to-primary/80",
      popular: true,
      features: [
        { name: "Accident Coverage", included: true },
        { name: "Emergency Care", included: true },
        { name: "X-Rays & Diagnostics", included: true },
        { name: "Illness Coverage", included: true },
        { name: "Routine Care", included: true },
        { name: "Dental Care", included: false },
      ],
    },
    {
      name: "Premium",
      price: "₪299",
      description: "Complete wellness & protection",
      color: "from-purple-400 to-purple-600",
      features: [
        { name: "Accident Coverage", included: true },
        { name: "Emergency Care", included: true },
        { name: "X-Rays & Diagnostics", included: true },
        { name: "Illness Coverage", included: true },
        { name: "Routine Care", included: true },
        { name: "Dental Care", included: true },
      ],
    },
  ];

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    toast({
      title: "Claim Submitted!",
      description: "Your claim has been submitted and is being reviewed. We'll contact you within 2-3 business days.",
    });

    // Reset form
    setClaimFormData({
      petName: "",
      claimType: "",
      claimDate: "",
      claimAmount: "",
      description: "",
      vetName: "",
      vetContact: "",
    });
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      <AppHeader 
        title="ביטוח חיות מחמד" 
        showBackButton={true}
        showMenuButton={false}
        extraAction={{
          icon: ShieldCheck,
          onClick: () => {}
        }}
      />

      {/* Tabs for Navigation */}
      <div className="px-4 -mt-6 relative z-20">
        <Tabs defaultValue="plans" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white shadow-lg rounded-2xl p-1 border border-gray-100">
            <TabsTrigger 
              value="plans" 
              className="rounded-xl font-jakarta font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              Plans
            </TabsTrigger>
            <TabsTrigger 
              value="claims" 
              className="rounded-xl font-jakarta font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              Claims
            </TabsTrigger>
            <TabsTrigger 
              value="policies" 
              className="rounded-xl font-jakarta font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              Policies
            </TabsTrigger>
          </TabsList>

          {/* Plans Tab */}
          <TabsContent value="plans" className="mt-6 space-y-6">
            {/* Why Choose Us */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-extrabold text-gray-900 font-jakarta mb-4">Why Choose Pet Insurance?</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Heart, title: "Peace of Mind", desc: "Know they're covered" },
                  { icon: Activity, title: "Quick Claims", desc: "Fast reimbursement" },
                  { icon: Award, title: "Best Coverage", desc: "Comprehensive plans" },
                  { icon: DollarSign, title: "Affordable", desc: "Plans from ₪99/mo" },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                  >
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                      <item.icon className="w-6 h-6 text-blue-500" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 font-jakarta mb-1">{item.title}</h3>
                    <p className="text-xs text-gray-600 font-jakarta">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Insurance Plans */}
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 font-jakarta mb-4">Choose Your Plan</h2>
              <div className="space-y-4">
                {insurancePlans.map((plan, index) => (
                  <motion.div
                    key={plan.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    <Card className={`relative overflow-hidden ${plan.popular ? 'border-2 border-blue-500' : 'border border-gray-200'}`}>
                      {plan.popular && (
                        <div className="absolute top-3 right-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                          Most Popular
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-extrabold text-gray-900 font-jakarta mb-1">{plan.name}</h3>
                            <p className="text-sm text-gray-600 font-jakarta">{plan.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-extrabold text-gray-900 font-jakarta">{plan.price}</div>
                            <div className="text-xs text-gray-500 font-jakarta">per month</div>
                          </div>
                        </div>

                        <div className="space-y-2 mb-5">
                          {plan.features.map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              {feature.included ? (
                                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <Check className="w-3 h-3 text-green-600" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <X className="w-3 h-3 text-gray-400" />
                                </div>
                              )}
                              <span className={`text-sm font-jakarta ${feature.included ? 'text-gray-900' : 'text-gray-400'}`}>
                                {feature.name}
                              </span>
                            </div>
                          ))}
                        </div>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              className={`w-full bg-gradient-to-r ${plan.color} text-white rounded-full font-jakarta font-bold py-6 shadow-lg hover:shadow-xl transition-all`}
                              onClick={() => setSelectedPlan(plan.name)}
                            >
                              Get Started
                              <ChevronRight className="w-5 h-5 ml-2" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="rounded-3xl max-w-[90vw]">
                            <DialogHeader>
                              <DialogTitle className="font-jakarta text-xl font-bold text-gray-900">
                                Subscribe to {plan.name} Plan
                              </DialogTitle>
                              <DialogDescription className="font-jakarta text-gray-600">
                                Complete your subscription to protect your pet with the {plan.name} plan.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div>
                                <Label className="font-jakarta font-semibold">Select Your Pet</Label>
                                <Select>
                                  <SelectTrigger className="mt-2 rounded-xl font-jakarta">
                                    <SelectValue placeholder="Choose a pet" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pet1">Max (Dog)</SelectItem>
                                    <SelectItem value="pet2">Luna (Cat)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                  <div className="text-sm text-gray-700 font-jakarta">
                                    <p className="font-bold mb-1">Coverage starts in 14 days</p>
                                    <p className="text-xs">Waiting period applies for illness coverage. Accidents covered after 48 hours.</p>
                                  </div>
                                </div>
                              </div>
                              <Button
                                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-jakarta font-bold py-6"
                                onClick={() => {
                                  toast({
                                    title: "Subscription Started!",
                                    description: `You're now subscribed to the ${plan.name} plan. Check your email for details.`,
                                  });
                                }}
                              >
                                Complete Subscription
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Coverage Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
            >
              <h3 className="text-lg font-extrabold text-gray-900 font-jakarta mb-4">What's Covered?</h3>
              <div className="space-y-3">
                {[
                  { icon: Syringe, title: "Emergency Care", desc: "24/7 emergency treatment" },
                  { icon: Pill, title: "Medications", desc: "Prescribed medicines coverage" },
                  { icon: Activity, title: "Surgery", desc: "All necessary procedures" },
                  { icon: FileText, title: "Lab Tests", desc: "Diagnostics and X-rays" },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-blue-50 rounded-xl">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <item.icon className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-gray-900 font-jakarta">{item.title}</h4>
                      <p className="text-xs text-gray-600 font-jakarta">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </TabsContent>

          {/* Claims Tab */}
          <TabsContent value="claims" className="mt-6 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-xl font-extrabold text-gray-900 font-jakarta mb-4">Submit a Claim</h2>
              <Card className="p-5">
                <form onSubmit={handleClaimSubmit} className="space-y-4">
                  <div>
                    <Label className="font-jakarta font-semibold">Pet Name</Label>
                    <Select
                      value={claimFormData.petName}
                      onValueChange={(value) => setClaimFormData({ ...claimFormData, petName: value })}
                    >
                      <SelectTrigger className="mt-2 rounded-xl font-jakarta">
                        <SelectValue placeholder="Select your pet" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="max">Max (Dog)</SelectItem>
                        <SelectItem value="luna">Luna (Cat)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="font-jakarta font-semibold">Claim Type</Label>
                    <Select
                      value={claimFormData.claimType}
                      onValueChange={(value) => setClaimFormData({ ...claimFormData, claimType: value })}
                    >
                      <SelectTrigger className="mt-2 rounded-xl font-jakarta">
                        <SelectValue placeholder="Select claim type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="accident">Accident</SelectItem>
                        <SelectItem value="illness">Illness</SelectItem>
                        <SelectItem value="routine">Routine Care</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="font-jakarta font-semibold">Date of Service</Label>
                    <Input
                      type="date"
                      value={claimFormData.claimDate}
                      onChange={(e) => setClaimFormData({ ...claimFormData, claimDate: e.target.value })}
                      className="mt-2 rounded-xl font-jakarta"
                    />
                  </div>

                  <div>
                    <Label className="font-jakarta font-semibold">Claim Amount</Label>
                    <div className="relative mt-2">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₪</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={claimFormData.claimAmount}
                        onChange={(e) => setClaimFormData({ ...claimFormData, claimAmount: e.target.value })}
                        className="pl-8 rounded-xl font-jakarta"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="font-jakarta font-semibold">Veterinarian Name</Label>
                    <Input
                      type="text"
                      placeholder="Dr. Smith's Animal Clinic"
                      value={claimFormData.vetName}
                      onChange={(e) => setClaimFormData({ ...claimFormData, vetName: e.target.value })}
                      className="mt-2 rounded-xl font-jakarta"
                    />
                  </div>

                  <div>
                    <Label className="font-jakarta font-semibold">Veterinarian Contact</Label>
                    <Input
                      type="text"
                      placeholder="Phone or email"
                      value={claimFormData.vetContact}
                      onChange={(e) => setClaimFormData({ ...claimFormData, vetContact: e.target.value })}
                      className="mt-2 rounded-xl font-jakarta"
                    />
                  </div>

                  <div>
                    <Label className="font-jakarta font-semibold">Description</Label>
                    <Textarea
                      placeholder="Describe the treatment and reason for claim..."
                      value={claimFormData.description}
                      onChange={(e) => setClaimFormData({ ...claimFormData, description: e.target.value })}
                      className="mt-2 rounded-xl font-jakarta min-h-[100px]"
                    />
                  </div>

                  <div>
                    <Label className="font-jakarta font-semibold mb-2 block">Upload Documents</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-gray-50">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-jakarta text-gray-600">
                        Click to upload invoices, receipts, or medical records
                      </p>
                      <p className="text-xs text-gray-500 font-jakarta mt-1">PDF, JPG, PNG (Max 10MB)</p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-jakarta font-bold py-6 shadow-lg hover:shadow-xl transition-all"
                  >
                    Submit Claim
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </form>
              </Card>
            </motion.div>

            {/* Recent Claims */}
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 font-jakarta mb-4">Recent Claims</h3>
              <div className="space-y-3">
                {[
                  { pet: "Max", type: "Emergency", amount: "₪850", status: "Approved", date: "Jan 15, 2025" },
                  { pet: "Luna", type: "Routine Care", amount: "₪320", status: "Processing", date: "Jan 10, 2025" },
                ].map((claim, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-bold text-gray-900 font-jakarta">{claim.pet}</h4>
                          <span className="text-xs text-gray-500 font-jakarta">• {claim.type}</span>
                        </div>
                        <p className="text-xs text-gray-600 font-jakarta">{claim.date}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900 font-jakarta mb-1">{claim.amount}</div>
                        <div className={`text-xs font-bold px-3 py-1 rounded-full ${
                          claim.status === "Approved" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {claim.status}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies" className="mt-6 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-xl font-extrabold text-gray-900 font-jakarta mb-4">My Policies</h2>
              <div className="space-y-4">
                <Card className="p-5 border-2 border-blue-500">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-extrabold text-gray-900 font-jakarta">Standard Plan</h3>
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                          Active
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 font-jakarta">Max (Dog) • Started Jan 1, 2025</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-extrabold text-gray-900 font-jakarta">₪199</div>
                      <div className="text-xs text-gray-500 font-jakarta">per month</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-blue-50 rounded-xl p-3">
                      <div className="text-xs text-gray-600 font-jakarta mb-1">Annual Limit</div>
                      <div className="text-lg font-bold text-gray-900 font-jakarta">₪10,000</div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3">
                      <div className="text-xs text-gray-600 font-jakarta mb-1">Used This Year</div>
                      <div className="text-lg font-bold text-green-600 font-jakarta">₪1,170</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl font-jakarta font-bold border-2"
                      onClick={() => toast({ title: "Policy Details", description: "Viewing full policy details..." })}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View Policy Details
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl font-jakarta font-bold border-2 text-orange-600 border-orange-200 hover:bg-orange-50"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Manage Subscription
                    </Button>
                  </div>
                </Card>

                {/* Add New Policy */}
                <Card className="p-5 border-2 border-dashed border-gray-300 bg-gray-50">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                      <ShieldCheck className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 font-jakarta mb-2">Add Another Pet</h3>
                    <p className="text-sm text-gray-600 font-jakarta mb-4">
                      Get coverage for all your furry friends
                    </p>
                    <Button
                      className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-jakarta font-bold px-8"
                      onClick={() => toast({ title: "Adding Pet", description: "Navigate to plans to add coverage..." })}
                    >
                      Add Pet Coverage
                    </Button>
                  </div>
                </Card>
              </div>
            </motion.div>

            {/* Contact Support */}
            <Card className="p-5 bg-gradient-to-br from-blue-50 to-white border border-blue-100">
              <h3 className="text-lg font-extrabold text-gray-900 font-jakarta mb-4">Need Help?</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Phone className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 font-jakarta">Phone Support</div>
                    <div className="text-sm text-gray-600 font-jakarta">1-800-PET-CARE</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Mail className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 font-jakarta">Email Support</div>
                    <div className="text-sm text-gray-600 font-jakarta">support@petid.co.il</div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default Insurance;
