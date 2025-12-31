"use client"

import type React from "react"
import { Check, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useState } from "react"

export interface PricingFeature {
  text: string
  hasInfo?: boolean
}

export interface PricingTier {
  name: string
  description: string
  price?: number
  priceLabel?: string
  billingPeriod?: string
  buttonText: string
  buttonVariant?: "default" | "secondary" | "outline"
  isPrimary?: boolean
  features: PricingFeature[]
  hasAnnualToggle?: boolean
  creditOptions?: string[]
  defaultCredits?: string
  featuresTitle?: string
}

export interface PricingProps {
  icon?: React.ReactNode
  title: string
  subtitle: string
  tiers: PricingTier[]
  footerTitle?: string
  footerDescription?: string
  footerButtonText?: string
  footerButtonLink?: string
  className?: string
  onTierSelect?: (tierName: string) => void
}

export function Pricing({
  icon,
  title,
  subtitle,
  tiers,
  footerTitle,
  footerDescription,
  footerButtonText,
  footerButtonLink,
  className,
  onTierSelect,
}: PricingProps) {
  const [annualBilling, setAnnualBilling] = useState<Record<string, boolean>>({})
  const [selectedCredits, setSelectedCredits] = useState<Record<string, string>>({})

  return (
    <section className={cn("py-8 w-full", className)} dir="rtl">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          {icon && <div className="mb-2">{icon}</div>}
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h2>
          <p className="max-w-2xl text-muted-foreground">
            {subtitle}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid w-full gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier, index) => (
            <Card
              key={index}
              className={cn(
                "relative flex flex-col gap-6 p-6 transition-all hover:shadow-lg",
                tier.isPrimary && "border-2 border-primary shadow-lg ring-2 ring-primary/20"
              )}
            >
              {tier.isPrimary && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
                  הכי פופולרי
                </div>
              )}

              {/* Tier Header */}
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-semibold text-foreground">{tier.name}</h3>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1">
                {tier.price !== undefined ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">₪{tier.price}</span>
                    <span className="text-sm text-muted-foreground">
                      {tier.billingPeriod || "לחודש"}
                    </span>
                  </div>
                ) : (
                  <span className="text-3xl font-bold text-foreground">{tier.priceLabel}</span>
                )}
              </div>

              {/* Annual Toggle */}
              {tier.hasAnnualToggle && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setAnnualBilling((prev) => ({
                        ...prev,
                        [tier.name]: !prev[tier.name],
                      }))
                    }
                    className={cn(
                      "w-11 h-6 rounded-full relative transition-colors",
                      annualBilling[tier.name] ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1 h-4 w-4 rounded-full bg-white transition-all",
                        annualBilling[tier.name] ? "left-1" : "left-6"
                      )}
                    />
                  </button>
                  <span className="text-sm text-muted-foreground">שנתי (חסכון 20%)</span>
                </div>
              )}

              {/* CTA Button */}
              <Button
                variant={tier.buttonVariant || (tier.isPrimary ? "default" : "outline")}
                className="w-full"
                onClick={() => onTierSelect?.(tier.name)}
              >
                {tier.buttonText}
              </Button>

              {/* Credit Options */}
              {tier.creditOptions && tier.creditOptions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Select
                    value={selectedCredits[tier.name] || tier.defaultCredits}
                    onValueChange={(value) =>
                      setSelectedCredits((prev) => ({
                        ...prev,
                        [tier.name]: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="בחר כמות" />
                    </SelectTrigger>
                    <SelectContent>
                      {tier.creditOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Features Title */}
              {tier.featuresTitle && (
                <p className="text-sm font-medium text-muted-foreground">
                  {tier.featuresTitle}
                </p>
              )}

              {/* Features List */}
              <ul className="flex flex-col gap-3">
                {tier.features.map((feature, featureIndex) => (
                  <li
                    key={featureIndex}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    <span>{feature.text}</span>
                    {feature.hasInfo && (
                      <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        {/* Footer Banner */}
        {footerTitle && (
          <Card className="flex w-full flex-col items-center justify-between gap-4 p-6 sm:flex-row bg-muted/50">
            <div className="flex flex-col gap-1 text-center sm:text-right">
              <h3 className="text-lg font-semibold text-foreground">{footerTitle}</h3>
              {footerDescription && (
                <p className="text-sm text-muted-foreground">{footerDescription}</p>
              )}
            </div>
            {footerButtonText && (
              <Button 
                variant="outline" 
                className="shrink-0"
                onClick={() => footerButtonLink && window.open(footerButtonLink, '_blank')}
                asChild={!!footerButtonLink}
              >
                {footerButtonLink ? (
                  <a href={footerButtonLink} target="_blank" rel="noopener noreferrer">
                    {footerButtonText}
                  </a>
                ) : (
                  footerButtonText
                )}
              </Button>
            )}
          </Card>
        )}
      </div>
    </section>
  )
}
