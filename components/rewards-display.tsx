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

  // Calculate points to earn based on subtotal after any rewards discount
  const discountedSubtotal = useRedemption ? orderSubtotal - discountAmount : orderSubtotal
  const pointsToEarn = Math.floor(discountedSubtotal)

  // Calculate new balance using the formula:
  // New Balance = (Current Balance - Redeemed Points) + Points Earned
  const newBalance = customer.rewardsPoints - (useRedemption ? POINTS_FOR_REDEMPTION : 0) + pointsToEarn

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 shadow-lg">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-full">
            <Gift className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-purple-800">🎁 Rewards Program</h3>
            <p className="text-sm text-purple-600">Welcome back, {customer.name}!</p>
          </div>
          <div className="ml-auto">
            <Badge className="bg-purple-600 text-white flex items-center gap-2 px-3 py-1 text-base">
              <Star className="w-4 h-4" />
              {customer.rewardsPoints} points
            </Badge>
          </div>
        </div>

        <div className="space-y-4">
          {/* Current Balance Display */}
          <div className="bg-white/80 p-4 rounded-lg border border-purple-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-800 mb-1">{customer.rewardsPoints} Reward Points</div>
              <div className="text-sm text-purple-600">Your current balance</div>
            </div>
          </div>

          {/* Redemption Section */}
          {canRedeem && (
            <div className="p-4 bg-white/90 rounded-lg border-2 border-green-300 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-green-800 text-lg">Redeem Available!</span>
                </div>
                <Badge className="bg-green-500 text-white text-base px-3 py-1">Save ${discountAmount.toFixed(2)}</Badge>
              </div>

              <div className="text-sm text-green-700 mb-4 bg-green-50 p-3 rounded">
                <strong>🎉 Great news!</strong> You can redeem {POINTS_FOR_REDEMPTION} points for a 10% discount on your
                order subtotal (${orderSubtotal.toFixed(2)}).
              </div>

              <Button
                onClick={() => onRedemptionToggle(!useRedemption)}
                className={`w-full text-base font-semibold py-3 ${
                  useRedemption
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
                size="lg"
              >
                {useRedemption ? (
                  <>
                    ✅ Redemption Applied (-{POINTS_FOR_REDEMPTION} points)
                    <br />
                    <span className="text-sm opacity-90">Click to remove discount</span>
                  </>
                ) : (
                  <>
                    🎁 Apply 10% Discount
                    <br />
                    <span className="text-sm opacity-90">Use {POINTS_FOR_REDEMPTION} points</span>
                  </>
                )}
              </Button>

              {useRedemption && (
                <div className="mt-3 p-3 bg-green-100 rounded-lg text-center">
                  <div className="text-sm text-green-800">
                    <strong>After redemption:</strong> You'll have{" "}
                    <span className="font-bold">{customer.rewardsPoints - POINTS_FOR_REDEMPTION}</span> points remaining
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Not Enough Points */}
          {!canRedeem && (
            <div className="text-center p-4 bg-white/60 rounded-lg border border-purple-200">
              <div className="text-purple-700 mb-2">
                <strong>Almost there!</strong>
              </div>
              <div className="text-sm text-purple-600">
                Earn {POINTS_FOR_REDEMPTION - customer.rewardsPoints} more points to unlock a 10% discount!
              </div>
              <div className="mt-2 bg-purple-100 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((customer.rewardsPoints / POINTS_FOR_REDEMPTION) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-purple-500 mt-1">
                {customer.rewardsPoints}/{POINTS_FOR_REDEMPTION} points
              </div>
            </div>
          )}

          {/* Points Preview for This Order - Updated with clear calculation */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-800 text-center mb-3">Rewards Calculation</h4>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-blue-700">Starting Balance:</span>
                <span className="font-medium">{customer.rewardsPoints} points</span>
              </div>

              {useRedemption && (
                <div className="flex justify-between items-center text-red-600">
                  <span>Points Redeemed:</span>
                  <span className="font-medium">-{POINTS_FOR_REDEMPTION} points</span>
                </div>
              )}

              <div className="flex justify-between items-center text-green-600">
                <span>Points Earned This Order:</span>
                <span className="font-medium">+{pointsToEarn} points</span>
              </div>

              <div className="border-t border-blue-200 pt-2 flex justify-between items-center font-bold text-blue-800">
                <span>New Balance:</span>
                <span>{newBalance} points</span>
              </div>

              <div className="text-xs text-blue-600 text-center mt-1">
                New Balance = (Current Balance - Redeemed Points) + Points Earned
              </div>
            </div>
          </div>

          {/* Program Info */}
          <div className="text-xs text-purple-500 border-t border-purple-200 pt-3 text-center">
            💡 <strong>How it works:</strong> Earn 1 point for every $1 spent • Redeem 100 points for 10% off
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
