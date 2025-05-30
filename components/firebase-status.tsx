"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertCircle, Database, Wifi, WifiOff } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore"

export default function FirebaseStatus() {
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "error">("checking")
  const [testResults, setTestResults] = useState<{
    read: boolean | null
    write: boolean | null
    delete: boolean | null
  }>({
    read: null,
    write: null,
    delete: null,
  })
  const [error, setError] = useState<string | null>(null)

  const runFirebaseTests = async () => {
    setConnectionStatus("checking")
    setError(null)
    setTestResults({ read: null, write: null, delete: null })

    try {
      // Test 1: Read from Firestore
      console.log("🔄 Testing Firestore read...")
      const ordersRef = collection(db, "orders")
      await getDocs(ordersRef)
      setTestResults((prev) => ({ ...prev, read: true }))
      console.log("✅ Firestore read test passed")

      // Test 2: Write to Firestore
      console.log("🔄 Testing Firestore write...")
      const testDoc = await addDoc(collection(db, "test"), {
        message: "Firebase connection test",
        timestamp: new Date(),
      })
      setTestResults((prev) => ({ ...prev, write: true }))
      console.log("✅ Firestore write test passed")

      // Test 3: Delete from Firestore
      console.log("🔄 Testing Firestore delete...")
      await deleteDoc(doc(db, "test", testDoc.id))
      setTestResults((prev) => ({ ...prev, delete: true }))
      console.log("✅ Firestore delete test passed")

      setConnectionStatus("connected")
    } catch (err) {
      console.error("❌ Firebase test failed:", err)
      setConnectionStatus("error")
      setError(err instanceof Error ? err.message : "Unknown error")

      // Set failed tests
      if (!testResults.read) setTestResults((prev) => ({ ...prev, read: false }))
      if (!testResults.write) setTestResults((prev) => ({ ...prev, write: false }))
      if (!testResults.delete) setTestResults((prev) => ({ ...prev, delete: false }))
    }
  }

  useEffect(() => {
    runFirebaseTests()
  }, [])

  const getStatusIcon = (status: boolean | null) => {
    if (status === null) return <AlertCircle className="w-4 h-4 text-yellow-500" />
    if (status === true) return <CheckCircle className="w-4 h-4 text-green-500" />
    return <XCircle className="w-4 h-4 text-red-500" />
  }

  const getStatusText = (status: boolean | null) => {
    if (status === null) return "Testing..."
    if (status === true) return "Passed"
    return "Failed"
  }

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-amber-200 mb-4">
      <CardHeader className="bg-amber-100/95 border-b border-amber-200">
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <Database className="w-5 h-5" />
          Firebase Connection Status
          <Badge
            className={`flex items-center gap-1 ${
              connectionStatus === "connected"
                ? "bg-green-100 text-green-800"
                : connectionStatus === "error"
                  ? "bg-red-100 text-red-800"
                  : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {connectionStatus === "connected" ? (
              <Wifi className="w-3 h-3" />
            ) : connectionStatus === "error" ? (
              <WifiOff className="w-3 h-3" />
            ) : (
              <AlertCircle className="w-3 h-3" />
            )}
            {connectionStatus === "connected" ? "Connected" : connectionStatus === "error" ? "Error" : "Checking"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Test Results */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(testResults.read)}
              <span className="text-sm">
                <strong>Read Test:</strong> {getStatusText(testResults.read)}
              </span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(testResults.write)}
              <span className="text-sm">
                <strong>Write Test:</strong> {getStatusText(testResults.write)}
              </span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(testResults.delete)}
              <span className="text-sm">
                <strong>Delete Test:</strong> {getStatusText(testResults.delete)}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <XCircle className="w-4 h-4" />
                <strong>Error:</strong>
              </div>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {connectionStatus === "connected" && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-4 h-4" />
                <strong>Firebase is working correctly!</strong>
              </div>
              <p className="text-green-700 text-sm mt-1">Your app can read, write, and delete data from Firestore.</p>
            </div>
          )}

          {/* Retry Button */}
          <Button onClick={runFirebaseTests} variant="outline" className="w-full">
            Run Tests Again
          </Button>

          {/* Configuration Info */}
          <div className="text-xs text-gray-600 space-y-1">
            <div>
              <strong>Project ID:</strong> pd-pastry-delights-e0f76
            </div>
            <div>
              <strong>Collection:</strong> orders
            </div>
            <div>
              <strong>Rules:</strong> Make sure Firestore rules allow read/write for testing
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
