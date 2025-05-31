"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Gift, Star, Sparkles } from "lucide-react"
import { type Customer, canRedeemPoints, POINTS_FOR_REDEMPTION, REDEMPTION_DISCOUNT_PERCENT } from "@/lib/rewards"

interface RewardsDisplayProps {
  customer: Customer | null
  orderSubtotal: number
  onRedemptionToggle: (useRedemption: boolean) => void
  useRedemption: boolean
  isLoading?: boolean
}

export default function RewardsDisplay({
  customer,
  orderSubtotal,
  onRedemptionToggle,
  useRedemption,
  isLoading = false,
}: RewardsDisplayProps) {
  if (!customer || isLoading) {
    return null
  }

  const canRedeem = canRedeemPoints(customer.rewardsPoints)
  const discountAmount = orderSubtotal * REDEMPTION_DISCOUNT_PERCENT

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-purple-800">🎁 Rewards Program</h3>
          <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1">
            <Star className="w-3 h-3" />
            {customer.rewardsPoints} points
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="text-sm text-purple-700">
            <div className="flex justify-between items-center">
              <span>Welcome back, {customer.name}!</span>
              <span className="font-medium">{customer.rewardsPoints} points available</span>
            </div>
          </div>

          {canRedeem && (
            <div className="p-3 bg-white/80 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-purple-800">Redeem {POINTS_FOR_REDEMPTION} points</span>
                </div>
                <Badge className="bg-green-100 text-green-800">Save ${discountAmount.toFixed(2)}</Badge>
              </div>

              <div className="text-sm text-purple-600 mb-3">
                Get 10% off your order subtotal (${orderSubtotal.toFixed(2)})
              </div>

              <Button
                onClick={() => onRedemptionToggle(!useRedemption)}
                className={`w-full ${
                  useRedemption
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
                size="sm"
              >
                {useRedemption ? "✅ Redemption Applied" : "Apply 10% Discount"}
              </Button>
            </div>
          )}

          {!canRedeem && (
            <div className="text-sm text-purple-600 bg-white/60 p-2 rounded">
              Earn {POINTS_FOR_REDEMPTION - customer.rewardsPoints} more points to unlock a 10% discount!
            </div>
          )}

          <div className="text-xs text-purple-500 border-t border-purple-200 pt-2">
            💡 Earn 1 point for every $1 spent • Redeem 100 points for 10% off
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
